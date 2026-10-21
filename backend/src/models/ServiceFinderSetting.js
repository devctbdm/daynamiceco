import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Singleton visibility switch for the whole homepage "service finder" section
 * (managed from /admin/service-finder). Individual cards keep their own
 * `active` flag — this one hides the entire section from the storefront.
 */
export const serviceFinderSettings = pgTable("service_finder_settings", {
  id: text("id").primaryKey().default("default"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
