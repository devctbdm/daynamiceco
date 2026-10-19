import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const promoCodeEntries = pgTable(
  "promo_code_entries",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    description: text("description").notNull().default(""),
    type: text("type").notNull().default("percentage"),
    value: doublePrecision("value").notNull(),
    minOrder: doublePrecision("min_order").notNull().default(0),
    maxDiscount: doublePrecision("max_discount").notNull().default(0),
    maxUses: doublePrecision("max_uses").notNull().default(0),
    perUserLimit: doublePrecision("per_user_limit").notNull().default(1),
    usageCount: doublePrecision("usage_count").notNull().default(0),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by"),
    categories: jsonb("categories").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("promo_code_entries_code_unique").on(table.code),
    index("promo_code_entries_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    check(
      "promo_code_entries_type_check",
      sql`${table.type} in ('percentage', 'fixed', 'free_shipping')`,
    ),
    check(
      "promo_code_entries_status_check",
      sql`${table.status} in ('active', 'inactive')`,
    ),
    check("promo_code_entries_value_nonnegative", sql`${table.value} >= 0`),
    check(
      "promo_code_entries_percentage_max",
      sql`${table.type} <> 'percentage' or ${table.value} <= 100`,
    ),
    check(
      "promo_code_entries_min_order_nonnegative",
      sql`${table.minOrder} >= 0`,
    ),
    check(
      "promo_code_entries_max_discount_nonnegative",
      sql`${table.maxDiscount} >= 0`,
    ),
    check(
      "promo_code_entries_max_uses_nonnegative",
      sql`${table.maxUses} >= 0`,
    ),
    check(
      "promo_code_entries_per_user_limit_nonnegative",
      sql`${table.perUserLimit} >= 0`,
    ),
    check(
      "promo_code_entries_usage_count_nonnegative",
      sql`${table.usageCount} >= 0`,
    ),
    check(
      "promo_code_entries_categories_array_check",
      sql`jsonb_typeof(${table.categories}) = 'array'`,
    ),
  ],
);

export function isPromoActive(promo, now = new Date()) {
  if (promo.status !== "active") return false;
  if (promo.startDate && new Date(promo.startDate) > now) return false;
  if (promo.endDate && new Date(promo.endDate) < now) return false;
  if (promo.maxUses > 0 && promo.usageCount >= promo.maxUses) return false;
  return true;
}

export function computePromoDiscount(promo, subtotal, now = new Date()) {
  if (!isPromoActive(promo, now)) {
    return { valid: false, reason: "inactive", discount: 0 };
  }
  if (promo.minOrder > 0 && subtotal < promo.minOrder) {
    return { valid: false, reason: "min-order", discount: 0 };
  }
  let discount = 0;
  if (promo.type === "percentage") {
    discount = (subtotal * promo.value) / 100;
    if (promo.maxDiscount > 0 && discount > promo.maxDiscount) {
      discount = promo.maxDiscount;
    }
  } else if (promo.type === "fixed") {
    discount = promo.value;
  }
  discount = Math.min(discount, subtotal);
  return { valid: true, reason: null, discount };
}

export function computePromoItemDiscount(
  promo,
  items = [],
  orderSubtotal = 0,
  expandedCategories,
  now = new Date(),
) {
  if (!isPromoActive(promo, now)) {
    return { valid: false, reason: "inactive", discount: 0 };
  }
  if (promo.minOrder > 0 && (Number(orderSubtotal) || 0) < promo.minOrder) {
    return { valid: false, reason: "min-order", discount: 0 };
  }
  const scopedSource =
    Array.isArray(expandedCategories) && expandedCategories.length
      ? expandedCategories
      : promo.categories || [];
  const scoped = scopedSource
    .map((category) => String(category).trim().toLowerCase())
    .filter(Boolean);
  let matchingSubtotal = Number(orderSubtotal) || 0;
  if (scoped.length) {
    matchingSubtotal = items.reduce((sum, item) => {
      const categories = (
        Array.isArray(item.categories)
          ? item.categories
          : item.category
            ? [item.category]
            : []
      ).map((category) => String(category).trim().toLowerCase());
      return categories.some((category) => scoped.includes(category))
        ? sum + (Number(item.price) || 0) * (Number(item.quantity) || 1)
        : sum;
    }, 0);
    if (matchingSubtotal <= 0) {
      return { valid: false, reason: "no-category", discount: 0 };
    }
  }
  let discount = 0;
  if (promo.type === "percentage") {
    discount = (matchingSubtotal * promo.value) / 100;
    if (promo.maxDiscount > 0 && discount > promo.maxDiscount) {
      discount = promo.maxDiscount;
    }
  } else if (promo.type === "fixed") {
    discount = promo.value;
  }
  discount = Math.min(discount, matchingSubtotal);
  return { valid: true, reason: null, discount, matchingSubtotal };
}
