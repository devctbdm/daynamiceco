import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { loyaltyTransactions } from "../src/models/LoyaltyTransaction.js";
import {
  calculateRedemption,
  calculateRefundPointTarget,
  DEFAULT_SETTINGS,
  estimateEarnedPoints,
  getEligibleSubtotal,
  LoyaltyService,
  validateSettings,
} from "../src/loyalty/loyalty.service.js";

test("default loyalty rules award one point per eligible hundred taka", () => {
  const items = [
    { product: { _id: "p1", category: "c1" }, price: 250, quantity: 2 },
    { product: { _id: "p2", category: "c1" }, price: 99, quantity: 1 },
  ];

  assert.equal(estimateEarnedPoints(items, DEFAULT_SETTINGS), 5);
  assert.equal(getEligibleSubtotal(items, DEFAULT_SETTINGS), 599);
});

test("product overrides take precedence and can exclude low-margin products", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    categoryOverrides: [
      { categoryId: "parts", pointsPerHundred: 2, enabled: true },
    ],
    productOverrides: [
      { productId: "low-margin", pointsPerHundred: 0, enabled: true },
    ],
  };
  const items = [
    {
      product: { _id: "low-margin", category: "parts" },
      price: 500,
      quantity: 1,
    },
    {
      product: { _id: "eligible", category: "parts" },
      price: 250,
      quantity: 1,
    },
  ];

  assert.equal(estimateEarnedPoints(items, settings), 5);
  assert.equal(getEligibleSubtotal(items, settings), 250);
});

test("redemption enforces balance, minimum and order discount cap", () => {
  const settings = { ...DEFAULT_SETTINGS };
  assert.deepEqual(calculateRedemption(500, 800, 5000, settings), {
    points: 500,
    discount: 50,
  });
  assert.throws(
    () => calculateRedemption(499, 800, 5000, settings),
    /Redeem at least 500 points/,
  );
  assert.throws(
    () => calculateRedemption(800, 800, 500, settings),
    /maximum discount/,
  );
  assert.throws(
    () => calculateRedemption(500, 499, 5000, settings),
    /Not enough available points/,
  );
});

test("partial and full refund point targets increase cumulatively without exceeding earned points", () => {
  const firstRefundTarget = calculateRefundPointTarget(500, 0.2);
  const fullRefundTarget = calculateRefundPointTarget(500, 1);

  assert.equal(firstRefundTarget, 100);
  assert.equal(fullRefundTarget, 500);
  assert.equal(calculateRefundPointTarget(3, 0.2), 0);
});

test("duplicate ledger events reuse their original transaction and reject conflicting payloads", async () => {
  const rows = new Map();
  const database = {
    insert() {
      let values;
      return {
        values(input) {
          values = input;
          return this;
        },
        onConflictDoNothing() {
          return this;
        },
        async returning() {
          if (rows.has(values.idempotencyKey)) return [];
          rows.set(values.idempotencyKey, values);
          return [values];
        },
      };
    },
    select() {
      let result;
      return {
        from() {
          return this;
        },
        where() {
          result = [...rows.values()];
          return this;
        },
        async limit() {
          return result;
        },
      };
    },
  };
  const service = new LoyaltyService(database);
  const event = {
    customerId: "customer-1",
    orderId: "order-1",
    type: "earn",
    points: 100,
    idempotencyKey: "delivery:order-1",
    reason: "Delivered order",
  };

  const first = await service.insertTransaction(database, event);
  const duplicate = await service.insertTransaction(database, event);
  assert.equal(duplicate.id, first.id);
  await assert.rejects(
    service.insertTransaction(database, { ...event, points: 200 }),
    /already used for a different transaction/,
  );
});

test("expiration logging reports missing loyalty schema and the migration command", () => {
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    new LoyaltyService({}).logExpirationFailure({
      message: "Failed query",
      cause: {
        code: "42P01",
        message: 'relation "loyalty_transactions" does not exist',
      },
    });
  } finally {
    console.error = originalError;
  }

  assert.match(errors[0], /npm run db:migrate/);
  assert.match(errors[0], /loyalty_transactions.*does not exist/);
});

test("settings are bounded and the ledger has a unique idempotency index", () => {
  assert.equal(validateSettings(DEFAULT_SETTINGS).expirationDays, 365);
  assert.throws(
    () =>
      validateSettings({ ...DEFAULT_SETTINGS, maximumRedemptionPercent: 101 }),
    /maximumRedemptionPercent/,
  );
  const config = getTableConfig(loyaltyTransactions);
  assert.ok(
    config.indexes.some(
      (index) =>
        index.config.name === "loyalty_transactions_idempotency_unique" &&
        index.config.unique,
    ),
  );
});

test("two sequential redemption checks cannot both spend the same available balance", () => {
  const settings = { ...DEFAULT_SETTINGS };
  const first = calculateRedemption(500, 500, 5000, settings);
  assert.equal(first.discount, 50);
  assert.throws(
    () => calculateRedemption(500, 0, 5000, settings),
    /Not enough available points/,
  );
});
