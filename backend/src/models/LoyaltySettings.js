import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const loyaltySettings = pgTable(
  "loyalty_settings",
  {
    id: text("id").primaryKey().default("default"),
    enabled: boolean("enabled").notNull().default(true),
    pointsPerHundred: doublePrecision("points_per_hundred").notNull().default(1),
    pointValue: doublePrecision("point_value").notNull().default(0.1),
    minimumRedemption: integer("minimum_redemption").notNull().default(500),
    maximumRedemptionPercent: doublePrecision("maximum_redemption_percent")
      .notNull()
      .default(10),
    expirationDays: integer("expiration_days").notNull().default(365),
    productOverrides: jsonb("product_overrides").notNull().default([]),
    categoryOverrides: jsonb("category_overrides").notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("loyalty_points_per_hundred_check", sql`${table.pointsPerHundred} >= 0`),
    check("loyalty_point_value_check", sql`${table.pointValue} > 0`),
    check("loyalty_minimum_redemption_check", sql`${table.minimumRedemption} >= 0`),
    check(
      "loyalty_maximum_redemption_percent_check",
      sql`${table.maximumRedemptionPercent} between 0 and 100`,
    ),
    check("loyalty_expiration_days_check", sql`${table.expirationDays} >= 0`),
  ],
);
