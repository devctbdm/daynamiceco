import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { getTableConfig } from "drizzle-orm/pg-core";
import { productFilterSettings } from "../src/models/ProductFilterSettings.js";
import { ProductFiltersService } from "../src/product-filters/product-filters.service.js";

test("product filter settings are unique per category and brand", () => {
  const table = getTableConfig(productFilterSettings);
  assert.deepEqual(
    table.primaryKeys[0].columns.map((column) => column.name),
    ["category_id", "brand"],
  );
});

function createDatabase() {
  const database = {
    inserted: null,
    insert() {
      return {
        values: (values) => {
          database.inserted = values;
          return {
            onConflictDoUpdate: ({ set }) => {
              database.inserted = { ...database.inserted, ...set };
              return {
                returning: async () => [database.inserted],
              };
            },
          };
        },
      };
    },
  };
  return database;
}

test("product filter settings save normalized category and facet data", async () => {
  const database = createDatabase();
  const service = new ProductFiltersService(database);
  const saved = await service.upsert({
    categoryId: " iphone ",
    price: true,
    rating: false,
    availability: true,
    facets: [" Storage ", "Brand", "Storage"],
  });

  assert.equal(saved.categoryId, "iphone");
  assert.equal(saved.brand, "");
  assert.deepEqual(saved.facets, ["Storage", "Brand"]);
  assert.equal(saved.price, true);
  assert.equal(saved.rating, false);
  assert.equal(saved.availability, true);
  assert.ok(saved.updatedAt instanceof Date);
});

test("product filter settings allow separate category and brand scopes", async () => {
  const database = createDatabase();
  const service = new ProductFiltersService(database);
  const saved = await service.upsert({
    categoryId: " monitor ",
    brand: " ASUS ",
    price: true,
    rating: false,
    availability: true,
    facets: ["Series", "Internal Storage", "Display Size"],
  });

  assert.equal(saved.categoryId, "monitor");
  assert.equal(saved.brand, "ASUS");
  assert.deepEqual(saved.facets, ["Series", "Internal Storage", "Display Size"]);
});

test("product filter settings reject invalid input", async () => {
  const service = new ProductFiltersService(createDatabase());

  await assert.rejects(
    service.upsert({
      categoryId: "all",
      price: "true",
      rating: true,
      availability: true,
      facets: [],
    }),
    BadRequestException,
  );
  await assert.rejects(
    service.upsert({
      categoryId: "all",
      price: true,
      rating: true,
      availability: true,
      facets: [" "],
    }),
    BadRequestException,
  );
});
