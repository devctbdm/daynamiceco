import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { orders } from "../src/models/Order.js";
import {
  applyCouponToLoyaltyItems,
  formatOrderStatus,
  serializeOrder,
} from "../src/orders/orders.service.js";
import { migrateLegacyOrderData } from "../src/utils/orderNumber.js";

test("orders use a normalized Neon table with indexed users and unique order numbers", () => {
  const config = getTableConfig(orders);

  assert.equal(config.name, "customer_orders");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [
      "id",
      "user_id",
      "items",
      "shipping_address",
      "total_amount",
      "shipping_fee",
      "coupon",
      "loyalty",
      "payment",
      "order_status",
      "note",
      "order_number",
      "advance_amount",
      "advance_paid",
      "advance_reference",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(config.columns[0].primary, true);
  assert.ok(
    config.indexes.some(
      (index) => index.config.name === "customer_orders_user_created_at_idx",
    ),
  );
  assert.ok(
    config.indexes.some(
      (index) =>
        index.config.name === "customer_orders_order_number_unique" &&
        index.config.unique,
    ),
  );
  assert.deepEqual(config.checks.map((constraint) => constraint.name).sort(), [
    "customer_orders_advance_amount_nonnegative",
    "customer_orders_advance_paid_nonnegative",
    "customer_orders_items_array_check",
    "customer_orders_order_status_check",
    "customer_orders_payment_status_check",
    "customer_orders_shipping_fee_nonnegative",
    "customer_orders_total_nonnegative",
  ]);
});

test("order serializer preserves the legacy API response shape", () => {
  const row = {
    id: "0123456789abcdef01234567",
    userId: "fedcba987654321001234567",
    items: [{ product: "111111111111111111111111", quantity: 2 }],
    shippingAddress: { street: "Main Street" },
    totalAmount: 1000,
    shippingFee: 0,
    coupon: { code: "", discount: 0 },
    payment: { method: "cod", status: "pending" },
    orderStatus: "pending",
    loyalty: {},
    note: "",
    orderNumber: "#1",
    advanceAmount: 0,
    advancePaid: 0,
    advanceReference: "",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  assert.deepEqual(serializeOrder(row), {
    _id: row.id,
    user: row.userId,
    items: row.items,
    shippingAddress: row.shippingAddress,
    totalAmount: 1000,
    shippingFee: 0,
    coupon: row.coupon,
    loyalty: {},
    payment: row.payment,
    orderStatus: "pending",
    note: "",
    orderNumber: "#1",
    advanceAmount: 0,
    advancePaid: 0,
    advanceReference: "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

test("coupon discounts are proportionally applied to loyalty-eligible item prices", () => {
  const items = [
    { product: { _id: "eligible" }, price: 600, quantity: 1 },
    { product: { _id: "excluded" }, price: 400, quantity: 1 },
  ];

  assert.deepEqual(applyCouponToLoyaltyItems(items, 1000, 100), [
    { product: { _id: "eligible" }, price: 540, quantity: 1 },
    { product: { _id: "excluded" }, price: 360, quantity: 1 },
  ]);
});

test("order statuses are formatted for customer notifications", () => {
  assert.equal(formatOrderStatus("send_courier"), "Send Courier");
  assert.equal(formatOrderStatus("delivered"), "Delivered");
});

test("legacy order normalization runs against Neon without Mongoose", async () => {
  const queries = [];
  const database = {
    async execute(query) {
      queries.push(
        query.queryChunks.flatMap((chunk) => chunk.value ?? []).join(""),
      );
      return { rows: queries.length === 1 ? [{ id: "order-1" }] : [] };
    },
  };

  assert.deepEqual(await migrateLegacyOrderData(database), {
    statuses: 1,
    orderNumbers: 0,
  });
  assert.match(queries[0], /UPDATE customer_orders/);
  assert.match(queries[0], /'shipped', 'delivered'/);
  assert.match(queries[1], /AIZ-/);
  assert.match(queries[1], /NOT EXISTS/);
});
