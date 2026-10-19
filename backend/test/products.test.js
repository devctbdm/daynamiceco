import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { productEntries } from "../src/models/Product.js";
import {
  calculateAverageRating,
  parsePcPart,
  productCloudinaryPublicId,
  ProductsService,
} from "../src/products/products.service.js";
import { serializeProduct } from "../src/products/products.repository.js";

test("product table uses normalized columns, indexes, and validation checks", () => {
  const table = getTableConfig(productEntries);
  assert.equal(table.name, "product_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "name",
      "slug",
      "description",
      "price",
      "discount_price",
      "cost_price",
      "sku",
      "product_code",
      "brand",
      "category",
      "categories",
      "images",
      "image_alts",
      "stock",
      "status",
      "featured",
      "holiday",
      "pc_part",
      "specifications",
      "content",
      "seo",
      "ratings",
      "average_rating",
      "created_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.ok(
    table.indexes.some(
      (index) =>
        index.config.name === "product_entries_slug_unique" &&
        index.config.unique,
    ),
  );
  assert.ok(
    table.indexes.some(
      (index) =>
        index.config.name === "product_entries_product_code_unique" &&
        index.config.unique,
    ),
  );
  assert.equal(table.checks.length, 9);
});

test("product serializer keeps Mongo-compatible ids and JSON field defaults", () => {
  const product = serializeProduct({
    id: "0123456789abcdef01234567",
    name: "Laptop",
    categories: null,
    images: null,
    imageAlts: null,
    pcPart: null,
    specifications: null,
    content: null,
    seo: null,
    ratings: null,
  });

  assert.equal(product._id, product.id);
  assert.deepEqual(product.categories, []);
  assert.deepEqual(product.images, []);
  assert.deepEqual(product.imageAlts, []);
  assert.equal(product.pcPart.enabled, false);
  assert.deepEqual(product.specifications, {});
  assert.equal(product.content, "");
  assert.deepEqual(product.seo, {});
  assert.deepEqual(product.ratings, []);
});

test("product validation rejects invalid create and rating data before database access", async () => {
  const database = {
    insert() {
      assert.fail("Invalid product input must not reach the database");
    },
    transaction() {
      assert.fail("Invalid ratings must not reach the database");
    },
  };
  const service = new ProductsService(database);

  await assert.rejects(service.create({}, [], "user"), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.equal(error.getResponse().message, "Please provide a product name");
    return true;
  });
  await assert.rejects(
    service.create(
      {
        name: "Laptop",
        description: "Laptop details",
        price: "-1",
        category: "Computers",
      },
      [{ path: "https://res.cloudinary.com/demo/image/upload/example.jpg" }],
      "user",
    ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().message, "Price cannot be negative");
      return true;
    },
  );
  await assert.rejects(
    service.addRating("0123456789abcdef01234567", "user", "6"),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        "Rating must be between 1 and 5",
      );
      return true;
    },
  );
});

test("PC-part defaults and approved-rating average remain compatible", () => {
  assert.deepEqual(parsePcPart({ enabled: false }), {
    enabled: false,
    type: "",
    socket: "",
    platform: "",
    formFactor: "",
    wattage: 0,
    specs: {},
  });
  assert.equal(
    parsePcPart({ enabled: true, type: "gpu", specs: { vram: 8 } }).type,
    "gpu",
  );
  assert.throws(
    () => parsePcPart({ enabled: true, type: "not-a-part" }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(
    calculateAverageRating([
      { rating: 4, status: "approved" },
      { rating: 5, status: "approved" },
      { rating: 1, status: "pending" },
      { rating: 1, status: "rejected" },
    ]),
    4.5,
  );
  assert.equal(calculateAverageRating([{ rating: 5, status: "pending" }]), 0);
});

test("product image cleanup only resolves assets in its Cloudinary folder", () => {
  assert.equal(
    productCloudinaryPublicId(
      "https://res.cloudinary.com/demo/image/upload/v123/apple-it-zone/products/item-1.webp",
    ),
    "apple-it-zone/products/item-1",
  );
  assert.equal(
    productCloudinaryPublicId(
      "https://res.cloudinary.com/demo/image/upload/v123/apple-it-zone/offers/item-1.webp",
    ),
    null,
  );
  assert.equal(
    productCloudinaryPublicId(
      "https://example.com/apple-it-zone/products/item-1",
    ),
    null,
  );
});
