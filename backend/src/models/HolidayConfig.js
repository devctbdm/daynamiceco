import {
  boolean,
  check,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const holidaySettings = pgTable(
  "holiday_settings",
  {
    key: text("key").primaryKey().default("default"),
    heroBadge: text("hero_badge").notNull().default("Special Holiday Offer"),
    title: text("title").notNull().default("Mega Offer"),
    subtitle: text("subtitle")
      .notNull()
      .default(
        "Celebrate the season with amazing deals on your favorite products!",
      ),
    discountPercent: real("discount_percent").notNull().default(70),
    endDate: timestamp("end_date", { withTimezone: true }).default(
      new Date("2026-12-31T23:59:59"),
    ),
    couponCode: text("coupon_code").notNull().default("HOLIDAY10"),
    couponDescription: text("coupon_description")
      .notNull()
      .default(
        "Use the code below at checkout and stack your savings on top of holiday prices.",
      ),
    topDealsTitle: text("top_deals_title")
      .notNull()
      .default("Top Holiday Deals"),
    topDealsSubtitle: text("top_deals_subtitle")
      .notNull()
      .default("Hand-picked favorites at their lowest prices of the year."),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "holiday_settings_discount_percent_nonnegative",
      sql`${table.discountPercent} >= 0`,
    ),
  ],
);

export const defaultHolidayConfig = () => ({
  key: "default",
  heroBadge: "Special Holiday Offer",
  title: "Mega Offer",
  subtitle:
    "Celebrate the season with amazing deals on your favorite products!",
  discountPercent: 70,
  endDate: "2026-12-31T23:59:59",
  couponCode: "HOLIDAY10",
  couponDescription:
    "Use the code below at checkout and stack your savings on top of holiday prices.",
  topDealsTitle: "Top Holiday Deals",
  topDealsSubtitle: "Hand-picked favorites at their lowest prices of the year.",
  active: true,
});
