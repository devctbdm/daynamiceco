import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const maintenanceSetting = pgTable("maintenance_config", {
  id: text("id").primaryKey().default("default"),
  enabled: boolean("enabled").notNull().default(false),
  message: text("message").notNull().default(""),
  endAt: timestamp("end_at", { withTimezone: true }),
  contactEmail: text("contact_email").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  sellingEnabled: boolean("selling_enabled").notNull().default(true),
  sellingMessage: text("selling_message").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
