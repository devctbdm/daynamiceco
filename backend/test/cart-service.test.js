import assert from "node:assert/strict";
import test from "node:test";
import { CartService } from "../src/cart/cart.service.js";

test("cart read returns a compatible empty cart for users without one", async () => {
  const database = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
  };
  const service = new CartService(database);

  assert.deepEqual(await service.getCart("user-1"), {
    user: "user-1",
    items: [],
    totalItems: 0,
    totalPrice: 0,
  });
});

test("cart read only exposes the populated product fields used by the API", async () => {
  const rows = [
    [
      {
        id: "cart-1",
        userId: "user-1",
        totalItems: 1,
        totalPrice: 12,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    ],
    [
      {
        id: "item-1",
        cartId: "cart-1",
        productId: "product-1",
        name: "Product snapshot",
        price: 12,
        promoDiscount: 0,
        quantity: 1,
        image: "snapshot.png",
      },
    ],
    [
      {
        id: "product-1",
        name: "Product",
        price: 12,
        images: ["product.png"],
        stock: 4,
      },
    ],
  ];
  const database = {
    select: () => {
      const result = rows.shift();
      const query = {
        from() {
          return this;
        },
        where() {
          return this;
        },
        limit() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };

  const cart = await new CartService(database).getCart("user-1");
  assert.deepEqual(cart.items[0].product, {
    _id: "product-1",
    id: "product-1",
    name: "Product",
    price: 12,
    images: ["product.png"],
    stock: 4,
  });
});

test("cart add validates required fields before touching the database", async () => {
  const service = new CartService({
    transaction: () => {
      throw new Error("Database should not be called for invalid input");
    },
  });

  await assert.rejects(service.addItem("user-1", {}), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.deepEqual(error.getResponse(), {
      success: false,
      message: "Product ID and quantity are required",
    });
    return true;
  });
});

test("cart update rejects non-positive quantities", async () => {
  const service = new CartService({
    transaction: () => {
      throw new Error("Database should not be called for invalid input");
    },
  });

  await assert.rejects(
    service.updateItem("user-1", "product-1", 0),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().message, "Quantity must be at least 1");
      return true;
    },
  );
});
