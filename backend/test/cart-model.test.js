import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { shoppingCarts, shoppingCartItems } from "../src/models/Cart.js";

test("cart tables use normalized PostgreSQL columns", () => {
  const cart = getTableConfig(shoppingCarts);
  const item = getTableConfig(shoppingCartItems);

  assert.equal(cart.name, "shopping_carts");
  assert.deepEqual(
    cart.columns.map((column) => column.name),
    ["id", "user_id", "total_items", "total_price", "created_at", "updated_at"],
  );
  assert.ok(cart.indexes.some((index) => index.config.unique));

  assert.equal(item.name, "shopping_cart_items");
  assert.ok(item.columns.some((column) => column.name === "promo_discount"));
  assert.ok(item.indexes.some((index) => index.config.unique));
  assert.equal(item.foreignKeys.length, 1);
});
