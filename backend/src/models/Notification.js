import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const notificationEntries = pgTable(
  "notification_entries",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull().default("system"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    link: text("link").notNull().default(""),
    read: boolean("read").notNull().default(false),
    orderId: text("order_id"),
    userId: text("user_id"),
    campaignId: text("campaign_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notification_entries_created_at_idx").on(table.createdAt),
    index("notification_entries_read_idx").on(table.read),
    index("notification_entries_read_updated_at_idx")
      .on(table.updatedAt)
      .where(sql`${table.read} = true`),
    index("notification_entries_unread_created_at_idx")
      .on(table.createdAt)
      .where(sql`${table.read} = false`),
    index("notification_entries_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("notification_entries_campaign_id_idx").on(table.campaignId),
    check(
      "notification_entries_category_check",
      sql`${table.category} in ('order', 'delivery', 'rider', 'payment', 'system')`,
    ),
    check(
      "notification_entries_title_check",
      sql`length(trim(${table.title})) > 0`,
    ),
    check(
      "notification_entries_description_check",
      sql`length(trim(${table.description})) > 0`,
    ),
  ],
);

export const notificationCampaignEntries = pgTable(
  "notification_campaign_entries",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull().default("system"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    link: text("link").notNull().default(""),
    recipientCount: integer("recipient_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notification_campaign_entries_created_at_idx").on(table.createdAt),
    check(
      "notification_campaign_entries_category_check",
      sql`${table.category} in ('order', 'delivery', 'rider', 'payment', 'system')`,
    ),
    check(
      "notification_campaign_entries_title_check",
      sql`length(trim(${table.title})) > 0`,
    ),
    check(
      "notification_campaign_entries_description_check",
      sql`length(trim(${table.description})) > 0`,
    ),
  ],
);

export function serializeNotification(row) {
  if (!row) return null;
  const { id, orderId, userId, campaignId, ...notification } = row;
  return {
    ...notification,
    order: orderId,
    ...(campaignId ? { campaignId } : {}),
    _id: id,
  };
}
