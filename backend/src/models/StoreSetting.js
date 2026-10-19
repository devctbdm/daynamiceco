import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const storeSettings = pgTable(
  "store_setting_entries",
  {
    id: text("id").primaryKey().default("default"),
    storeName: text("store_name").notNull().default(""),
    storeUrl: text("store_url").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    description: text("description").notNull().default(""),
    logoType: text("logo_type").notNull().default("text"),
    logoText: text("logo_text").notNull().default(""),
    logoSubText: text("logo_sub_text").notNull().default(""),
    logoIconUrl: text("logo_icon_url").notNull().default(""),
    logoUrl: text("logo_url").notNull().default(""),
    currency: text("currency").notNull().default("usd"),
    timezone: text("timezone").notNull().default("pt"),
    address: text("address").notNull().default(""),
    metaTitle: text("meta_title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("store_settings_singleton_check", sql`${table.id} = 'default'`),
    check(
      "store_settings_logo_type_check",
      sql`${table.logoType} in ('text', 'image')`,
    ),
  ],
);

export function serializeStoreSettings(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}
