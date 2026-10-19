import { and, count, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import {
  notificationEntries,
  serializeNotification,
} from "../models/Notification.js";

export async function createNotificationEntry(
  { category = "system", title, description, link = "", order = null },
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
      read: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error("Failed to create notification");
  return serializeNotification(row);
}

export async function listNotificationEntries(
  { page, limit, read, category },
  database = getDatabase(),
) {
  const conditions = [];
  if (read !== undefined) conditions.push(eq(notificationEntries.read, read));
  if (category) conditions.push(eq(notificationEntries.category, category));
  const where = conditions.length ? and(...conditions) : undefined;
  const [totalRows, unreadRows, rows] = await Promise.all([
    database.select({ total: count() }).from(notificationEntries).where(where),
    database
      .select({ total: count() })
      .from(notificationEntries)
      .where(eq(notificationEntries.read, false)),
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
    .where(eq(notificationEntries.read, false));
  return Number(result?.total ?? 0);
}

export async function markNotificationRead(id, database = getDatabase()) {
  const [row] = await database
    .update(notificationEntries)
    .set({ read: true, updatedAt: new Date() })
    .where(eq(notificationEntries.id, id))
    .returning();
  return serializeNotification(row);
}

export async function markAllNotificationsRead(database = getDatabase()) {
  await database
    .update(notificationEntries)
    .set({ read: true, updatedAt: new Date() })
    .where(eq(notificationEntries.read, false));
}
