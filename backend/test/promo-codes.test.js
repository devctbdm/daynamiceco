import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  computePromoDiscount,
  computePromoItemDiscount,
  isPromoActive,
  promoCodeEntries,
} from "../src/models/PromoCode.js";
import {
  normalizePromoInput,
  PromosService,
} from "../src/promos/promos.service.js";

const promoFixture = (overrides = {}) => ({
  code: "SAVE10",
  description: "",
  type: "percentage",
  value: 10,
  minOrder: 0,
  maxDiscount: 0,
  maxUses: 0,
  perUserLimit: 1,
  usageCount: 0,
  startDate: null,
  endDate: null,
  status: "active",
  categories: [],
  ...overrides,
});

test("promo table defines normalized columns, unique code and constraints", () => {
  const table = getTableConfig(promoCodeEntries);
  assert.equal(table.name, "promo_code_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "code",
      "description",
      "type",
      "value",
      "min_order",
      "max_discount",
      "max_uses",
      "per_user_limit",
      "usage_count",
      "start_date",
      "end_date",
      "status",
      "created_by",
      "categories",
      "created_at",
      "updated_at",
    ],
  );
  assert.ok(
    table.indexes.some(
      (index) =>
        index.config.name === "promo_code_entries_code_unique" &&
        index.config.unique,
    ),
  );
  assert.equal(table.checks.length, 10);
});

test("promo activity observes status, dates, and maximum redemptions", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");
  assert.equal(isPromoActive(promoFixture(), now), true);
  assert.equal(isPromoActive(promoFixture({ status: "inactive" }), now), false);
  assert.equal(
    isPromoActive(
      promoFixture({ startDate: new Date("2026-10-19T00:00:00.000Z") }),
      now,
    ),
    false,
  );
  assert.equal(
    isPromoActive(
      promoFixture({ endDate: new Date("2026-10-17T00:00:00.000Z") }),
      now,
    ),
    false,
  );
  assert.equal(
    isPromoActive(promoFixture({ maxUses: 2, usageCount: 2 }), now),
    false,
  );
});

test("promo discount logic retains minimum, cap, free-shipping and category behavior", () => {
  assert.deepEqual(
    computePromoDiscount(promoFixture({ minOrder: 100, maxDiscount: 15 }), 200),
    { valid: true, reason: null, discount: 15 },
  );
  assert.deepEqual(computePromoDiscount(promoFixture({ minOrder: 100 }), 99), {
    valid: false,
    reason: "min-order",
    discount: 0,
  });
  assert.equal(
    computePromoDiscount(promoFixture({ type: "fixed", value: 500 }), 200)
      .discount,
    200,
  );
  assert.equal(
    computePromoDiscount(
      promoFixture({ type: "free_shipping", value: 30 }),
      200,
    ).discount,
    0,
  );
  assert.deepEqual(
    computePromoItemDiscount(
      promoFixture({ categories: ["Computers"], value: 20 }),
      [
        { categories: ["Computers"], price: 50, quantity: 2 },
        { categories: ["Accessories"], price: 100, quantity: 1 },
      ],
      200,
      ["computers"],
    ),
    {
      valid: true,
      reason: null,
      discount: 20,
      matchingSubtotal: 100,
    },
  );
  assert.equal(
    computePromoItemDiscount(
      promoFixture({ categories: ["Computers"] }),
      [{ categories: ["Accessories"], price: 10, quantity: 1 }],
      10,
      [],
    ).reason,
    "no-category",
  );
});

test("promo input normalization uppercases codes and validates bounds", () => {
  assert.deepEqual(
    normalizePromoInput(
      {
        code: " save10 ",
        type: "percentage",
        value: "25",
        categories: ["Computers"],
      },
      true,
    ),
    {
      code: "SAVE10",
      description: "",
      type: "percentage",
      value: 25,
      minOrder: 0,
      maxDiscount: 0,
      maxUses: 0,
      perUserLimit: 1,
      startDate: null,
      endDate: null,
      status: "active",
      categories: ["Computers"],
    },
  );
  assert.throws(
    () =>
      normalizePromoInput(
        { code: "TOOBIG", type: "percentage", value: "101" },
        true,
      ),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message ===
        "Percentage value must be between 0 and 100",
  );
  assert.throws(
    () => normalizePromoInput({ code: "" }, true),
    (error) => error.getStatus() === 400,
  );
});

test("promo create reports a duplicate code rather than a successful fallback", async () => {
  const service = new PromosService({
    insert() {
      return {
        values() {
          return this;
        },
        returning() {
          return Promise.reject({ code: "23505" });
        },
      };
    },
  });
  await assert.rejects(
    service.create({ code: "SAVE10", type: "fixed", value: 10 }, "admin-id"),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().message, "Promo code already exists");
      return true;
    },
  );
});
