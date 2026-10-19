import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const homeSliderSettings = pgTable("home_slider_text_settings", {
  id: text("id").primaryKey().default("default"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
