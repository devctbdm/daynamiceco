import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const physicalStoreBannerSettings = pgTable(
  "physical_store_banner_settings",
  {
    id: text("id").primaryKey().default("default"),
    enabled: boolean("enabled").notNull().default(true),
    title: text("title").notNull().default("Physical Stores"),
    subtitle: text("subtitle")
      .notNull()
      .default("Visit Our Store & Get Your Desired IT Product!"),
    buttonLabel: text("button_label").notNull().default("Find Our Stores"),
    buttonLink: text("button_link").notNull().default("/physical-stores"),
    description: text("description").notNull().default(""),
    bannerUrl: text("banner_url").notNull().default(""),
    showCount: boolean("show_count").notNull().default(true),
    countSuffix: text("count_suffix").notNull().default("+"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
