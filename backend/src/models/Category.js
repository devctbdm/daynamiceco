import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const categoryEntries = pgTable(
  "category_entries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    parentId: text("parent_id"),
    active: boolean("active").notNull().default(true),
    imageUrl: text("image_url").notNull().default(""),
    bannerUrl: text("banner_url").notNull().default(""),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    color: text("color").notNull().default("#0071e3"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("category_entries_slug_unique").on(table.slug),
    index("category_entries_parent_sort_order_idx").on(
      table.parentId,
      table.sortOrder,
    ),
    check(
      "category_entries_name_length_check",
      sql`char_length(${table.name}) between 1 and 200`,
    ),
  ],
);
