import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const popupOfferSettings = pgTable(
  "popup_offer_settings",
  {
    id: text("id").primaryKey().default("default"),
    image: text("image").notNull().default(""),
    enabled: boolean("enabled").notNull().default(false),
    delaySeconds: integer("delay_seconds").notNull().default(30),
    maxShowsPerDay: integer("max_shows_per_day").notNull().default(1),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "popup_offer_settings_delay_seconds_check",
      sql`${table.delaySeconds} between 30 and 300`,
    ),
    check(
      "popup_offer_settings_max_shows_check",
      sql`${table.maxShowsPerDay} between 1 and 3`,
    ),
  ],
);
