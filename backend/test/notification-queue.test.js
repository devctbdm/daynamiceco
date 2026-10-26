import assert from "node:assert/strict";
import test from "node:test";
import {
  notificationEntries,
  serializeNotification,
} from "../src/models/Notification.js";
import {
  createNotificationEntries,
  deleteExpiredNotifications,
} from "../src/notifications/notifications.repository.js";
import { enqueueNotification } from "../src/notifications/notification-queue.js";

test("notification enqueue stores a bounded payload and returns its public shape", async () => {
  let command;
  const notification = await enqueueNotification(
    {
      category: "order",
      title: "New order",
      description: "Order placed",
      order: "order-id",
    },
    {
      eval: async (script, options) => {
        command = { script, options };
        return "stream-entry-id";
      },
    },
  );

  assert.equal(command.options.keys[0], "notifications:pending");
  assert.equal(command.options.arguments[0], "100000");
  const queued = JSON.parse(command.options.arguments[1]);
  assert.equal(queued.id, notification._id);
  assert.equal(queued.orderId, "order-id");
  assert.equal(notification.order, "order-id");
  assert.equal(notification.read, false);
  assert.equal(notification.title, "New order");
});

test("customer notifications retain their private recipient only in storage", async () => {
  let payload;
  const notification = await enqueueNotification(
    {
      userId: "customer-id",
      category: "order",
      title: "Order processing",
      description: "Your order is processing",
    },
    {
      eval: async (_script, options) => {
        payload = JSON.parse(options.arguments[1]);
        return "stream-entry-id";
      },
    },
  );

  assert.equal(payload.userId, "customer-id");
  assert.equal("userId" in notification, false);
  const publicNotification = serializeNotification({
    ...payload,
    orderId: null,
  });
  assert.equal("userId" in publicNotification, false);
});

test("notification enqueue rejects at capacity and rejects invalid input", async () => {
  const redis = { eval: async () => null };
  await assert.rejects(
    enqueueNotification(
      { title: "New order", description: "Order placed" },
      redis,
    ),
    /queue is full/,
  );
  await assert.rejects(
    enqueueNotification(
      {
        category: "unknown",
        title: "New order",
        description: "Order placed",
      },
      redis,
    ),
    /Unsupported notification category/,
  );
});

test("notification worker batch insert ignores retries by stable notification ID", async () => {
  const entries = [{ id: "notification-id", title: "New order" }];
  let inserted;
  let ignoredConflicts = false;
  const database = {
    insert(table) {
      assert.equal(table, notificationEntries);
      return {
        values(values) {
          inserted = values;
          return {
            onConflictDoNothing: async () => {
              ignoredConflicts = true;
            },
          };
        },
      };
    },
  };

  await createNotificationEntries(entries, database);
  assert.equal(inserted, entries);
  assert.equal(ignoredConflicts, true);
});

test("expired notification cleanup uses indexed batched deletes", async () => {
  const deleteConditions = [];
  const selectedConditions = [];
  const selectedLimits = [];
  const database = {
    select() {
      return {
        from(table) {
          assert.equal(table, notificationEntries);
          return {
            where(condition) {
              selectedConditions.push(condition);
              return {
                orderBy() {
                  return {
                    limit(limit) {
                      selectedLimits.push(limit);
                      return { subquery: true };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    delete(table) {
      assert.equal(table, notificationEntries);
      return {
        where(condition) {
          deleteConditions.push(condition);
          return {
            returning: async () => [],
          };
        },
      };
    },
  };

  const deleted = await deleteExpiredNotifications({
    now: new Date("2026-10-26T00:00:00.000Z"),
    database,
  });
  assert.equal(deleted, 0);
  assert.equal(deleteConditions.length, 2);
  assert.equal(selectedConditions.length, 2);
  assert.deepEqual(selectedLimits, [500, 500]);
});
