import { and, count, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import {
  notificationCampaignEntries,
  notificationEntries,
  serializeNotification,
} from "../models/Notification.js";
import { userEntries } from "../models/User.js";

export async function createNotificationEntry(
  {
    category = "system",
    title,
    description,
    link = "",
    order = null,
    userId = null,
  },
  database = getDatabase(),
) {
  const now = new Date();
  const [row] = await database
    .insert(notificationEntries)
    .values({
      id: randomUUID(),
      category,
      title,
      description,
      link,
      orderId: order == null ? null : String(order),
      userId,
      read: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error("Failed to create notification");
  return serializeNotification(row);
}

export async function createNotificationEntries(
  entries,
  database = getDatabase(),
) {
  if (entries.length === 0) return;
  await database
    .insert(notificationEntries)
    .values(entries)
    .onConflictDoNothing();
}

export async function deleteExpiredNotifications({
  now = new Date(),
  batchSize = 500,
  database = getDatabase(),
} = {}) {
  const readCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const unreadCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let deleted = 0;

  for (const { read, cutoff, timestamp } of [
    {
      read: true,
      cutoff: readCutoff,
      timestamp: notificationEntries.updatedAt,
    },
    {
      read: false,
      cutoff: unreadCutoff,
      timestamp: notificationEntries.createdAt,
    },
  ]) {
    let batch;
    do {
      batch = await database
        .delete(notificationEntries)
        .where(
          inArray(
            notificationEntries.id,
            database
              .select({ id: notificationEntries.id })
              .from(notificationEntries)
              .where(
                and(eq(notificationEntries.read, read), lte(timestamp, cutoff)),
              )
              .orderBy(timestamp)
              .limit(batchSize),
          ),
        )
        .returning({ id: notificationEntries.id });
      deleted += batch.length;
    } while (batch.length === batchSize);
  }

  return deleted;
}

export async function listNotificationEntries(
  { page, limit, read, category },
  database = getDatabase(),
) {
  const conditions = [];
  if (read !== undefined) conditions.push(eq(notificationEntries.read, read));
  if (category) conditions.push(eq(notificationEntries.category, category));
  conditions.push(isNull(notificationEntries.userId));
  const where = and(...conditions);
  const [totalRows, unreadRows, rows] = await Promise.all([
    database.select({ total: count() }).from(notificationEntries).where(where),
    database
      .select({ total: count() })
      .from(notificationEntries)
      .where(
        and(
          eq(notificationEntries.read, false),
          isNull(notificationEntries.userId),
        ),
      ),
    database
      .select()
      .from(notificationEntries)
      .where(where)
      .orderBy(desc(notificationEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);
  return {
    notifications: rows.map(serializeNotification),
    total: Number(totalRows[0]?.total ?? 0),
    unreadCount: Number(unreadRows[0]?.total ?? 0),
  };
}

export async function countUnreadNotifications(database = getDatabase()) {
  const [result] = await database
    .select({ total: count() })
    .from(notificationEntries)
    .where(
      and(
        eq(notificationEntries.read, false),
        isNull(notificationEntries.userId),
      ),
    );
  return Number(result?.total ?? 0);
}

export async function listCustomerNotificationEntries(
  userId,
  { page, limit, read },
  database = getDatabase(),
) {
  const conditions = [eq(notificationEntries.userId, String(userId))];
  if (read !== undefined) conditions.push(eq(notificationEntries.read, read));
  const where = and(...conditions);
  const [totalRows, unreadRows, rows] = await Promise.all([
    database.select({ total: count() }).from(notificationEntries).where(where),
    database
      .select({ total: count() })
      .from(notificationEntries)
      .where(
        and(
          eq(notificationEntries.userId, String(userId)),
          eq(notificationEntries.read, false),
        ),
      ),
    database
      .select()
      .from(notificationEntries)
      .where(where)
      .orderBy(desc(notificationEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);
  return {
    notifications: rows.map(serializeNotification),
    total: Number(totalRows[0]?.total ?? 0),
    unreadCount: Number(unreadRows[0]?.total ?? 0),
  };
}

export async function markNotificationRead(
  id,
  database = getDatabase(),
  userId,
) {
  const markedAt = new Date();
  const conditions = [eq(notificationEntries.id, id)];
  if (userId !== undefined) {
    conditions.push(eq(notificationEntries.userId, String(userId)));
  } else {
    conditions.push(isNull(notificationEntries.userId));
  }
  const [row] = await database
    .update(notificationEntries)
    .set({
      read: true,
      updatedAt: sql`CASE WHEN ${notificationEntries.read} = false THEN ${markedAt} ELSE ${notificationEntries.updatedAt} END`,
    })
    .where(and(...conditions))
    .returning();
  return serializeNotification(row);
}

export async function markAllNotificationsRead(
  database = getDatabase(),
  userId,
) {
  const conditions = [eq(notificationEntries.read, false)];
  if (userId !== undefined) {
    conditions.push(eq(notificationEntries.userId, String(userId)));
  } else {
    conditions.push(isNull(notificationEntries.userId));
  }
  await database
    .update(notificationEntries)
    .set({ read: true, updatedAt: new Date() })
    .where(and(...conditions));
}

export async function listNotificationCampaigns(
  { page, limit },
  database = getDatabase(),
) {
  const [totalRows, campaigns] = await Promise.all([
    database.select({ total: count() }).from(notificationCampaignEntries),
    database
      .select()
      .from(notificationCampaignEntries)
      .orderBy(desc(notificationCampaignEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);
  const ids = campaigns.map(({ id }) => id);
  const stats = ids.length
    ? await database
        .select({
          campaignId: notificationEntries.campaignId,
          readCount: sql`count(*) filter (where ${notificationEntries.read} = true)`,
        })
        .from(notificationEntries)
        .where(inArray(notificationEntries.campaignId, ids))
        .groupBy(notificationEntries.campaignId)
    : [];
  const readCounts = new Map(
    stats.map(({ campaignId, readCount }) => [campaignId, Number(readCount)]),
  );
  return {
    campaigns: campaigns.map((campaign) => ({
      ...campaign,
      _id: campaign.id,
      readCount: readCounts.get(campaign.id) ?? 0,
    })),
    total: Number(totalRows[0]?.total ?? 0),
  };
}

export async function createNotificationCampaign(
  input,
  database = getDatabase(),
) {
  const campaignId = randomUUID();
  const now = new Date();
  return database.transaction(async (transaction) => {
    const customers = await transaction
      .select({ id: userEntries.id })
      .from(userEntries)
      .where(
        and(eq(userEntries.role, "customer"), eq(userEntries.status, "active")),
      );
    const [campaign] = await transaction
      .insert(notificationCampaignEntries)
      .values({
        id: campaignId,
        ...input,
        recipientCount: customers.length,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!campaign) throw new Error("Failed to create notification campaign");

    for (let offset = 0; offset < customers.length; offset += 500) {
      const entries = customers.slice(offset, offset + 500).map(({ id }) => ({
        id: randomUUID(),
        category: input.category,
        title: input.title,
        description: input.description,
        link: input.link,
        read: false,
        orderId: null,
        userId: id,
        campaignId,
        createdAt: now,
        updatedAt: now,
      }));
      if (entries.length) {
        await transaction.insert(notificationEntries).values(entries);
      }
    }
    return { campaign, recipientIds: customers.map(({ id }) => id) };
  });
}

export async function updateNotificationCampaign(
  id,
  input,
  database = getDatabase(),
) {
  return database.transaction(async (transaction) => {
    const recipients = await transaction
      .select({ userId: notificationEntries.userId })
      .from(notificationEntries)
      .where(eq(notificationEntries.campaignId, id));
    const [campaign] = await transaction
      .update(notificationCampaignEntries)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(notificationCampaignEntries.id, id))
      .returning();
    if (!campaign) return null;

    await transaction
      .update(notificationEntries)
      .set({
        category: input.category,
        title: input.title,
        description: input.description,
        link: input.link,
        updatedAt: new Date(),
      })
      .where(eq(notificationEntries.campaignId, id));
    return {
      campaign,
      recipientIds: recipients.map(({ userId }) => userId).filter(Boolean),
    };
  });
}

export async function deleteNotificationCampaign(id, database = getDatabase()) {
  return database.transaction(async (transaction) => {
    await transaction
      .delete(notificationEntries)
      .where(eq(notificationEntries.campaignId, id));
    const [campaign] = await transaction
      .delete(notificationCampaignEntries)
      .where(eq(notificationCampaignEntries.id, id))
      .returning({ id: notificationCampaignEntries.id });
    return Boolean(campaign);
  });
}
