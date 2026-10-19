import {
  boolean,
  check,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const homeSliderTextEntries = pgTable(
  "home_slider_text_entries",
  {
    id: text("id").primaryKey(),
    text: text("text").notNull(),
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
    index("home_slider_text_entries_active_sort_order_idx").on(
      table.active,
      table.sortOrder,
    ),
    check(
      "home_slider_text_entries_text_length_check",
      sql`char_length(${table.text}) between 1 and 200`,
    ),
    check(
      "home_slider_text_entries_sort_order_check",
      sql`${table.sortOrder} >= 0`,
    ),
  ],
);
