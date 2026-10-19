import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { CategoriesController } from "../src/categories/categories.controller.js";
import { CategoriesService } from "../src/categories/categories.service.js";
import { categoryEntries } from "../src/models/Category.js";

const rows = [
  {
    id: "category-b",
    name: "Bravo",
    slug: "bravo",
    description: "",
    parentId: null,
    active: true,
    imageUrl: "",
    bannerUrl: "",
    featured: false,
    sortOrder: 2,
    color: "#0071e3",
    createdBy: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "category-a",
    name: "Alpha",
    slug: "alpha",
    description: "",
    parentId: null,
    active: true,
    imageUrl: "",
    bannerUrl: "",
    featured: false,
    sortOrder: 1,
    color: "#0071e3",
    createdBy: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

function makeDatabase() {
  const query = {
    from(table) {
      assert.equal(table, categoryEntries);
      return this;
    },
    orderBy(...ordering) {
      assert.equal(ordering.length, 2);
      return Promise.resolve(
        [...rows].sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            left.name.localeCompare(right.name),
        ),
      );
    },
    where(condition) {
      this.filterId = condition.queryChunks.find(
        (chunk) => typeof chunk?.value === "string",
      )?.value;
      return this;
    },
    async limit(count) {
      return Promise.resolve(
        rows.filter((row) => row.id === this.filterId).slice(0, count),
      );
    },
  };

  return {
    select() {
      return query;
    },
  };
}

test("category table normalizes category fields and defines required indexes", () => {
  const config = getTableConfig(categoryEntries);

  assert.equal(config.name, "category_entries");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [
      "id",
      "name",
      "slug",
      "description",
      "parent_id",
      "active",
      "image_url",
      "banner_url",
      "featured",
      "sort_order",
      "color",
      "created_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.ok(
    config.indexes.some(
      (index) =>
        index.config.name === "category_entries_slug_unique" &&
        index.config.unique,
    ),
  );
  assert.ok(
    config.indexes.some(
      (index) => index.config.name === "category_entries_parent_sort_order_idx",
    ),
  );
});

test("category list returns categories ordered by sort order and name", async () => {
  const service = new CategoriesService(makeDatabase());
  const controller = new CategoriesController(service);

  assert.deepEqual(await controller.findAll(), {
    success: true,
    categories: [
      {
        _id: "category-a",
        id: "category-a",
        name: "Alpha",
        slug: "alpha",
        description: "",
        parentId: null,
        active: true,
        imageUrl: "",
        bannerUrl: "",
        featured: false,
        sortOrder: 1,
        color: "#0071e3",
        createdBy: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      {
        _id: "category-b",
        id: "category-b",
        name: "Bravo",
        slug: "bravo",
        description: "",
        parentId: null,
        active: true,
        imageUrl: "",
        bannerUrl: "",
        featured: false,
        sortOrder: 2,
        color: "#0071e3",
        createdBy: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    ],
  });
});

test("category detail returns the requested category and the legacy envelope", async () => {
  const service = new CategoriesService(makeDatabase());
  const controller = new CategoriesController(service);

  assert.deepEqual(await controller.findById("category-a"), {
    success: true,
    category: {
      _id: "category-a",
      id: "category-a",
      name: "Alpha",
      slug: "alpha",
      description: "",
      parentId: null,
      active: true,
      imageUrl: "",
      bannerUrl: "",
      featured: false,
      sortOrder: 1,
      color: "#0071e3",
      createdBy: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  });
});

test("category creation validates required names before writing", async () => {
  const service = new CategoriesService({
    insert() {
      assert.fail("Invalid category must not reach the database");
    },
  });

  await assert.rejects(service.create({ name: "  " }), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.deepEqual(error.getResponse(), {
      success: false,
      message: "Please provide a category name",
    });
    return true;
  });
});

test("category creation normalizes fields and preserves uploaded image paths", async () => {
  let inserted;
  const now = new Date(0);
  const service = new CategoriesService({
    insert(table) {
      assert.equal(table, categoryEntries);
      return {
        values(values) {
          inserted = values;
          return {
            returning: async () => [
              { ...values, createdAt: now, updatedAt: now },
            ],
          };
        },
      };
    },
  });

  const category = await service.create(
    {
      name: "  Mac Accessories  ",
      description: "  Accessories  ",
      parentId: "0123456789abcdef01234567",
      active: "false",
      featured: "true",
      sortOrder: "3",
    },
    {
      image: [{ path: "https://res.cloudinary.com/demo/category.png" }],
      banner: [{ path: "https://res.cloudinary.com/demo/banner.png" }],
    },
    "abcdefabcdefabcdefabcdef",
  );

  assert.equal(inserted.name, "Mac Accessories");
  assert.equal(inserted.slug, "mac-accessories");
  assert.equal(inserted.description, "Accessories");
  assert.equal(inserted.parentId, "0123456789abcdef01234567");
  assert.equal(inserted.active, false);
  assert.equal(inserted.featured, true);
  assert.equal(inserted.sortOrder, 3);
  assert.equal(
    inserted.imageUrl,
    "https://res.cloudinary.com/demo/category.png",
  );
  assert.equal(
    inserted.bannerUrl,
    "https://res.cloudinary.com/demo/banner.png",
  );
  assert.equal(inserted.createdBy, "abcdefabcdefabcdefabcdef");
  assert.match(category._id, /^[a-f\d]{24}$/);
});

test("category reorder rejects malformed payloads", async () => {
  const service = new CategoriesService({
    update() {
      assert.fail("Invalid reorder payload must not reach the database");
    },
  });

  await assert.rejects(service.reorder({}), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.equal(error.getResponse().message, "orders must be an array");
    return true;
  });
});

test("category detail reports missing records as a 404", async () => {
  const service = new CategoriesService({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
  });
  const controller = new CategoriesController(service);

  await assert.rejects(controller.findById("missing"), (error) => {
    assert.equal(error.getStatus(), 404);
    assert.deepEqual(error.getResponse(), {
      success: false,
      message: "Category not found",
    });
    return true;
  });
});
