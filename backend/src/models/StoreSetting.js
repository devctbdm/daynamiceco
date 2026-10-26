import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
    footerConfig: jsonb("footer_config")
      .notNull()
      .default({
        enabled: true,
        support: {
          enabled: true,
          title: "Support",
          hours: "9:00 AM - 8:00 PM",
          phone: "",
          locationTitle: "Store Locator",
          location: "Dhaka, Bangladesh",
        },
        about: {
          enabled: true,
          title: "About Us",
          links: [
            ["about-0", "Online Delivery"],
            ["about-1", "Refund and Returns policy"],
            ["about-2", "Blog"],
            ["about-3", "EMI Terms"],
            ["about-4", "Privacy Policy"],
            ["about-5", "Contact Us"],
            ["about-6", "Terms and Conditions"],
            ["about-7", "Brands"],
          ].map(([id, label]) => ({ id, label, url: "/", enabled: true })),
        },
        contact: {
          enabled: true,
          title: "Stay Connected",
          addressLabel: "Address",
          phoneLabel: "Phone",
          emailLabel: "Email",
        },
        apps: {
          enabled: true,
          title: "Get our app on your mobile",
          googlePlayLabel: "Google Play",
          googlePlayUrl: "",
          appStoreLabel: "App Store",
          appStoreUrl: "",
        },
        social: {
          enabled: true,
          links: [
            ["social-whatsapp", "WhatsApp", "FaWhatsapp", "https://wa.me/"],
            [
              "social-facebook",
              "Facebook",
              "FaFacebook",
              "https://www.facebook.com/",
            ],
            [
              "social-youtube",
              "YouTube",
              "FaYoutube",
              "https://www.youtube.com/",
            ],
            [
              "social-instagram",
              "Instagram",
              "FaInstagram",
              "https://www.instagram.com/",
            ],
          ].map(([id, label, icon, url]) => ({
            id,
            label,
            icon,
            url,
            enabled: true,
          })),
        },
        copyright: {
          text: "",
          poweredBy: true,
          poweredByLabel: "Powered by",
          poweredByText: "Apple IT Zone",
        },
      }),
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
