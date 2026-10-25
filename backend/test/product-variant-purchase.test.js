import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProductPurchaseStock,
  changeProductVariantStock,
  resolveProductPurchase,
} from "../src/products/products.repository.js";
import { OrdersService } from "../src/orders/orders.service.js";

const product = {
  name: "iPhone",
  price: 400000,
  discountPrice: 0,
  stock: 20,
  images: ["product.png"],
  variants: [
    {
      _id: "black-256",
      color: "Black",
      storage: "256GB",
      price: 274999,
      discountPrice: 0,
      stock: 3,
      sku: "IPHONE-BLK-256",
      enabled: true,
      images: ["black.png"],
    },
    {
      _id: "orange-256",
      color: "Orange",
      storage: "256GB",
      price: 319999,
      discountPrice: 309999,
      stock: 2,
      sku: "IPHONE-ORG-256",
      enabled: true,
    },
    {
      _id: "black-512",
      color: "Black",
      storage: "512GB",
      price: 314999,
      discountPrice: 0,
      stock: 1,
      sku: "IPHONE-BLK-512",
      enabled: true,
    },
    {
      _id: "orange-512",
      color: "Orange",
      storage: "512GB",
      price: 359999,
      discountPrice: 0,
      stock: 0,
      sku: "IPHONE-ORG-512",
      enabled: true,
    },
  ],
};

test("variant purchase uses the exact stored combination price, SKU, stock, and image", () => {
  const purchase = resolveProductPurchase(product, "orange-256");

  assert.equal(purchase.variantLabel, "Orange / 256GB");
  assert.equal(purchase.price, 309999);
  assert.equal(purchase.promoDiscount, 10000);
  assert.equal(purchase.sku, "IPHONE-ORG-256");
  assert.equal(purchase.stock, 2);
  assert.equal(purchase.image, "product.png");
});

test("variant purchases do not infer prices from other combinations", () => {
  assert.equal(resolveProductPurchase(product, "black-256").price, 274999);
  assert.equal(resolveProductPurchase(product, "black-512").price, 314999);
  assert.equal(resolveProductPurchase(product, "orange-512").price, 359999);
  assert.equal(resolveProductPurchase(product, "orange-512").stock, 0);
  assert.throws(
    () =>
      assertProductPurchaseStock(
        resolveProductPurchase(product, "orange-512"),
        1,
        product.name,
      ),
    /Insufficient stock.*Orange \/ 512GB/,
  );
});

test("variant purchases reject missing, invalid, and disabled selections", () => {
  assert.throws(() => resolveProductPurchase(product), /select a combination/);
  assert.throws(
    () => resolveProductPurchase(product, "missing"),
    /combination.*unavailable/,
  );
  assert.throws(
    () =>
      resolveProductPurchase(
        {
          ...product,
          variants: [{ ...product.variants[0], enabled: false }],
        },
        "black-256",
      ),
    /combination.*unavailable/,
  );
});

test("products without variants retain their normal sale-price behavior", () => {
  const simpleProduct = {
    name: "Accessory",
    price: 1000,
    discountPrice: 850,
    stock: 5,
    images: ["accessory.png"],
    variants: [],
  };
  const purchase = resolveProductPurchase(simpleProduct);

  assert.equal(purchase.price, 850);
  assert.equal(purchase.promoDiscount, 150);
  assert.equal(purchase.stock, 5);
  assert.equal(purchase.image, "accessory.png");
});

test("variant stock is decremented and restored against its own combination", async () => {
  const row = {
    id: "0123456789abcdef01234567",
    variants: [{ _id: "black-256", stock: 2, enabled: true }],
  };
  const database = {
    transaction: (callback) =>
      callback({
        select: () => ({
          from() {
            return this;
          },
          where() {
            return this;
          },
          for() {
            return this;
          },
          limit: async () => [row],
        }),
        update: () => ({
          set(values) {
            row.variants = values.variants;
            return this;
          },
          where: async () => [],
        }),
      }),
  };

  assert.equal(
    await changeProductVariantStock(
      row.id,
      "black-256",
      -1,
      { requireAvailable: true },
      database,
    ),
    true,
  );
  assert.equal(row.variants[0].stock, 1);
  assert.equal(
    await changeProductVariantStock(
      row.id,
      "black-256",
      -2,
      { requireAvailable: true },
      database,
    ),
    false,
  );
  assert.equal(row.variants[0].stock, 1);
  assert.equal(
    await changeProductVariantStock(
      row.id,
      "black-256",
      1,
      {},
      database,
    ),
    true,
  );
  assert.equal(row.variants[0].stock, 2);
});

test("order preparation saves the selected combination price and decrements its stock", async () => {
  const row = {
    id: "0123456789abcdef01234567",
    name: product.name,
    slug: "iphone",
    description: "",
    price: product.price,
    discountPrice: 0,
    category: "phones",
    categories: ["phones"],
    images: product.images,
    stock: product.stock,
    status: "active",
    variants: product.variants.map((variant) => ({ ...variant })),
  };
  const selectBuilder = () => {
    const builder = {
      from() {
        return this;
      },
      where() {
        return this;
      },
      for() {
        return this;
      },
      limit: async () => [row],
      then(resolve, reject) {
        return Promise.resolve([row]).then(resolve, reject);
      },
    };
    return builder;
  };
  const database = {
    select: selectBuilder,
    transaction: (callback) =>
      callback({
        select: selectBuilder,
        update: () => ({
          set(values) {
            row.variants = values.variants;
            return this;
          },
          where: async () => [],
        }),
      }),
  };

  const prepared = await new OrdersService(database).prepareItems(
    [{ product: row.id, variantId: "orange-256", quantity: 1 }],
    false,
  );

  assert.equal(prepared.items[0].price, 309999);
  assert.equal(prepared.items[0].variantId, "orange-256");
  assert.equal(prepared.items[0].variantLabel, "Orange / 256GB");
  assert.equal(prepared.items[0].sku, "IPHONE-ORG-256");
  assert.equal(row.variants[1].stock, 1);
  assert.equal(prepared.subtotal, 309999);
});
