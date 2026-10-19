import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sliderSettingEntries = pgTable(
  "slider_setting_entries",
  {
    id: text("id").primaryKey().default("default"),
    enabled: boolean("enabled").notNull().default(true),
    autoSlide: boolean("auto_slide").notNull().default(true),
    interval: integer("interval").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "slider_setting_entries_singleton_check",
      sql`${table.id} = 'default'`,
    ),
    check(
      "slider_setting_entries_interval_check",
      sql`${table.interval} between 3 and 10`,
    ),
  ],
);

export function serializeSliderSetting(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}
