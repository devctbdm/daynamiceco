import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Home page "service finder" cards (Laptop Finder, Service center, …).
 * Each card is an icon + title + subtitle, optionally linking somewhere, and
 * can be shown/hidden on the homepage from /admin/service-finder.
 */
export const serviceFinderEntries = pgTable(
  "service_finder_entries",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    /** Icon key resolved to a lucide icon by the admin + storefront. */
    icon: text("icon").notNull().default("sparkles"),
    /** Optional link target; empty renders a non-clickable card. */
    href: text("href").notNull().default(""),
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
    index("service_finder_entries_active_sort_order_idx").on(
      table.active,
      table.sortOrder,
    ),
    check(
      "service_finder_entries_title_length_check",
      sql`char_length(${table.title}) between 1 and 80`,
    ),
    check(
      "service_finder_entries_subtitle_length_check",
      sql`char_length(${table.subtitle}) <= 160`,
    ),
    check(
      "service_finder_entries_sort_order_check",
      sql`${table.sortOrder} >= 0`,
    ),
  ],
);
