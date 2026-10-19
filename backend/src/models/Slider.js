import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sliderEntries = pgTable(
  "slider_entries",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    image: text("image").notNull().default(""),
    link: text("link").notNull().default(""),
    type: text("type").notNull().default("hero"),
    active: boolean("active").notNull().default(true),
    sortOrder: doublePrecision("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("slider_entries_type_sort_order_idx").on(table.type, table.sortOrder),
    index("slider_entries_active_idx").on(table.active),
    check(
      "slider_entries_title_length_check",
      sql`char_length(${table.title}) <= 200`,
    ),
    check(
      "slider_entries_description_length_check",
      sql`char_length(${table.description}) <= 500`,
    ),
    check(
      "slider_entries_type_check",
      sql`${table.type} in ('hero', 'ad_top', 'ad_bottom')`,
    ),
    check("slider_entries_sort_order_check", sql`${table.sortOrder} >= 0`),
  ],
);

export function serializeSlider(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}
