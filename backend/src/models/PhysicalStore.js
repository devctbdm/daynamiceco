import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const physicalStoreEntries = pgTable(
  "physical_store_entries",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    address: text("address").notNull().default(""),
    description: text("description").notNull().default(""),
    phones: jsonb("phones").notNull().default([]),
    openTime: text("open_time").notNull().default(""),
    closeTime: text("close_time").notNull().default(""),
    offDay: text("off_day").notNull().default(""),
    mapUrl: text("map_url").notNull().default(""),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("physical_store_entries_active_sort_order_idx").on(
      table.active,
      table.sortOrder,
    ),
    check(
      "physical_store_entries_title_length_check",
      sql`char_length(${table.title}) between 1 and 120`,
    ),
    check(
      "physical_store_entries_sort_order_nonnegative",
      sql`${table.sortOrder} >= 0`,
    ),
    check(
      "physical_store_entries_phones_array_check",
      sql`jsonb_typeof(${table.phones}) = 'array'`,
    ),
  ],
);
