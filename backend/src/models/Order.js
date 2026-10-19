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

export const orders = pgTable(
  "customer_orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    items: jsonb("items").notNull().default([]),
    shippingAddress: jsonb("shipping_address").notNull().default({}),
    totalAmount: doublePrecision("total_amount").notNull(),
    coupon: jsonb("coupon").notNull().default({ code: "", discount: 0 }),
    payment: jsonb("payment")
      .notNull()
      .default({ method: "sslcommerz", status: "pending" }),
    orderStatus: text("order_status").notNull().default("pending"),
    note: text("note").notNull().default(""),
    orderNumber: text("order_number"),
    advanceAmount: doublePrecision("advance_amount").notNull().default(0),
    advancePaid: doublePrecision("advance_paid").notNull().default(0),
    advanceReference: text("advance_reference").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("customer_orders_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("customer_orders_status_idx").on(table.orderStatus),
    uniqueIndex("customer_orders_order_number_unique").on(table.orderNumber),
    uniqueIndex("customer_orders_payment_tran_id_unique").on(
      sql`(${table.payment}->>'tran_id')`,
    ),
    check("customer_orders_total_nonnegative", sql`${table.totalAmount} >= 0`),
    check(
      "customer_orders_items_array_check",
      sql`jsonb_typeof(${table.items}) = 'array'`,
    ),
    check(
      "customer_orders_order_status_check",
      sql`${table.orderStatus} in ('pending', 'processing', 'confirmed', 'send_courier', 'cancelled')`,
    ),
    check(
      "customer_orders_payment_status_check",
      sql`${table.payment}->>'status' in ('pending', 'paid', 'failed', 'cancelled')`,
    ),
    check(
      "customer_orders_advance_amount_nonnegative",
      sql`${table.advanceAmount} >= 0`,
    ),
    check(
      "customer_orders_advance_paid_nonnegative",
      sql`${table.advancePaid} >= 0`,
    ),
  ],
);
