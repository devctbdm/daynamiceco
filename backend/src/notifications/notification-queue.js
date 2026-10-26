import { randomUUID } from "node:crypto";
import { getRedis } from "../config/redis.js";
import { serializeNotification } from "../models/Notification.js";
import {
  createNotificationEntries,
  deleteExpiredNotifications,
} from "./notifications.repository.js";

const STREAM = "notifications:pending";
const GROUP = "notification-writers";
const REFRESH_CHANNEL = "notifications:refresh";
const CATEGORIES = new Set(["order", "delivery", "rider", "payment", "system"]);

const positiveInteger = (name, fallback) => {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return Number(value);
};

const MAX_QUEUE_LENGTH = positiveInteger(
  "NOTIFICATION_QUEUE_MAX_LENGTH",
  100_000,
);
const WORKER_BATCH_SIZE = positiveInteger(
  "NOTIFICATION_WORKER_BATCH_SIZE",
  100,
);
const CLAIM_IDLE_MS = positiveInteger("NOTIFICATION_CLAIM_IDLE_MS", 60_000);
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_LOCK_TTL_SECONDS = 24 * 60 * 60;
const RETENTION_LOCK = "notifications:retention:lease";

const ENQUEUE_SCRIPT = `
  if tonumber(redis.call('XLEN', KEYS[1])) >= tonumber(ARGV[1]) then
    return false
  end
  return redis.call('XADD', KEYS[1], '*', 'payload', ARGV[2])
`;

const ACK_AND_DELETE_SCRIPT = `
  local ids = {}
  for i = 2, #ARGV do
    ids[#ids + 1] = ARGV[i]
  end
  redis.call('XACK', KEYS[1], ARGV[1], unpack(ids))
  return redis.call('XDEL', KEYS[1], unpack(ids))
`;

const REMOVE_RETENTION_LOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

export async function enqueueNotification({
  category = "system",
  title,
  description,
  link = "",
  order = null,
  userId = null,
}, redisClient = getRedis()) {
  if (!CATEGORIES.has(category)) {
    throw new Error(`Unsupported notification category: ${category}`);
  }
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Notification title is required");
  }
  if (typeof description !== "string" || !description.trim()) {
    throw new Error("Notification description is required");
  }
  if (typeof link !== "string") {
    throw new Error("Notification link must be a string");
  }

  const redis = redisClient;
  if (!redis) throw new Error("Redis notification queue is unavailable");

  const now = new Date();
  const record = {
    id: randomUUID(),
    category,
    title,
    description,
    link,
    read: false,
    orderId: order == null ? null : String(order),
    userId: userId == null ? null : String(userId),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const streamId = await redis.eval(ENQUEUE_SCRIPT, {
    keys: [STREAM],
    arguments: [String(MAX_QUEUE_LENGTH), JSON.stringify(record)],
  });
  if (!streamId) {
    throw new Error(
      `Notification queue is full (limit ${MAX_QUEUE_LENGTH}); notification was not queued`,
    );
  }

  return {
    ...serializeNotification(record),
    createdAt: now,
    updatedAt: now,
  };
}

const ensureConsumerGroup = async (redis) => {
  try {
    await redis.xGroupCreate(STREAM, GROUP, "0", { MKSTREAM: true });
  } catch (error) {
    if (!error.message?.includes("BUSYGROUP")) throw error;
  }
};

const persistMessages = async (redis, messages) => {
  if (messages.length === 0) return;

  const records = messages.map(({ message }) => {
    const record = JSON.parse(message.payload);
    return {
      ...record,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  });
  const unreadCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const currentRecords = records.filter(
    ({ createdAt }) => createdAt.getTime() > unreadCutoff,
  );

  await createNotificationEntries(currentRecords);
  await redis.eval(ACK_AND_DELETE_SCRIPT, {
    keys: [STREAM],
    arguments: [GROUP, ...messages.map(({ id }) => id)],
  });

  for (const record of currentRecords) {
    try {
      await redis.publish(
        REFRESH_CHANNEL,
        JSON.stringify({
          userId: record.userId,
          notification: serializeNotification(record),
        }),
      );
    } catch (error) {
      console.error("Failed to publish notification refresh:", error.message);
    }
  }
};

export async function startNotificationWorker() {
  const redis = getRedis();
  if (!redis) throw new Error("Redis notification queue is unavailable");

  const reader = redis.duplicate();
  reader.on("error", (error) => {
    console.error("Notification worker Redis error:", error.message);
  });
  try {
    await reader.connect();
    await ensureConsumerGroup(reader);
  } catch (error) {
    if (reader.isOpen) await reader.quit();
    throw error;
  }

  const consumer = `${process.env.HOSTNAME || "worker"}:${process.pid}:${randomUUID()}`;
  let stopping = false;
  let retryDelay = 1000;
  let nextRetentionAt = 0;

  const runRetentionIfDue = async () => {
    if (Date.now() < nextRetentionAt) return;
    const token = randomUUID();
    const acquired = await redis.set(RETENTION_LOCK, token, {
      NX: true,
      EX: RETENTION_LOCK_TTL_SECONDS,
    });
    nextRetentionAt = Date.now() + RETENTION_INTERVAL_MS;
    if (!acquired) return;

    try {
      const deleted = await deleteExpiredNotifications();
      if (deleted > 0) {
        console.log(`Deleted ${deleted} expired notification(s)`);
      }
    } catch (error) {
      nextRetentionAt = 0;
      throw error;
    } finally {
      await redis.eval(REMOVE_RETENTION_LOCK_SCRIPT, {
        keys: [RETENTION_LOCK],
        arguments: [token],
      });
    }
  };

  const run = async () => {
    while (!stopping) {
      try {
        await runRetentionIfDue();
        const claimed = await reader.xAutoClaim(
          STREAM,
          GROUP,
          consumer,
          CLAIM_IDLE_MS,
          "0-0",
          { COUNT: WORKER_BATCH_SIZE },
        );
        const claimedMessages = claimed.messages.filter(Boolean);
        if (claimedMessages.length) {
          await persistMessages(reader, claimedMessages);
          retryDelay = 1000;
          continue;
        }

        const streams = await reader.xReadGroup(
          GROUP,
          consumer,
          [{ key: STREAM, id: ">" }],
          { COUNT: WORKER_BATCH_SIZE, BLOCK: 1000 },
        );
        const messages = streams?.flatMap((stream) => stream.messages) ?? [];
        if (messages.length) {
          await persistMessages(reader, messages);
        }
        retryDelay = 1000;
      } catch (error) {
        if (stopping) break;
        console.error("Notification worker failed:", error.message);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay = Math.min(retryDelay * 2, 30_000);
      }
    }
  };

  const worker = run();
  return async () => {
    stopping = true;
    await worker;
    if (reader.isOpen) await reader.quit();
  };
}

export async function startNotificationRefreshSubscriber(
  { onAdminNotification, onCustomerNotification },
) {
  const redis = getRedis();
  if (!redis) throw new Error("Redis notification queue is unavailable");

  const subscriber = redis.duplicate();
  subscriber.on("error", (error) => {
    console.error("Notification refresh subscriber Redis error:", error.message);
  });
  try {
    await subscriber.connect();
    await subscriber.subscribe(REFRESH_CHANNEL, (message) => {
      try {
        const refresh = JSON.parse(message);
        if (refresh.userId) {
          onCustomerNotification(refresh.userId, refresh.notification);
        } else {
          onAdminNotification(refresh.notification);
        }
      } catch (error) {
        console.error("Invalid notification refresh message:", error.message);
      }
    });
  } catch (error) {
    if (subscriber.isOpen) await subscriber.quit();
    throw error;
  }

  return async () => {
    try {
      await subscriber.unsubscribe(REFRESH_CHANNEL);
    } finally {
      if (subscriber.isOpen) await subscriber.quit();
    }
  };
}
