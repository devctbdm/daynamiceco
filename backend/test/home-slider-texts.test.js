import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { homeSliderTextEntries } from "../src/models/HomeSliderText.js";
import { HomeSliderTextsService } from "../src/home-slider-texts/home-slider-texts.service.js";

test("home slider text entries use a normalized table and indexed ordering", () => {
  const config = getTableConfig(homeSliderTextEntries);

  assert.equal(config.name, "home_slider_text_entries");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [
      "id",
      "text",
      "active",
      "sort_order",
      "created_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(config.columns[0].primary, true);
  assert.equal(
    config.indexes[0].config.name,
    "home_slider_text_entries_active_sort_order_idx",
  );
});

test("home slider text list optionally filters active rows and serializes Mongo-compatible ids", async () => {
  let where;
  let order;
  const row = sliderTextRow();
  const service = new HomeSliderTextsService({
    select: () => ({
      from: () => ({
        orderBy(...columns) {
          order = columns;
          return {
            where(condition) {
              where = condition;
              return Promise.resolve([row]);
            },
            then(resolve, reject) {
              return Promise.resolve([row]).then(resolve, reject);
            },
          };
        },
      }),
    }),
  });

  assert.deepEqual(await service.findAll(true), [serializeExpected(row)]);
  assert.ok(where);
  assert.equal(order.length, 2);
});

test("home slider text create trims text, applies defaults, and generates an ObjectId-shaped id", async () => {
  let inserted;
  const row = sliderTextRow({
    text: "Welcome",
    active: true,
    sortOrder: 0,
    createdBy: "admin-id",
  });
  const service = new HomeSliderTextsService({
    insert(table) {
      assert.equal(table, homeSliderTextEntries);
      return {
        values(values) {
          inserted = values;
          return this;
        },
        returning: async () => [{ ...row, id: inserted.id }],
      };
    },
  });

  const created = await service.create({ text: "  Welcome  " }, "admin-id");
  assert.equal(inserted.text, "Welcome");
  assert.equal(inserted.active, true);
  assert.equal(inserted.sortOrder, 0);
  assert.equal(inserted.createdBy, "admin-id");
  assert.match(created._id, /^[a-f\d]{24}$/);
  assert.equal(created.text, "Welcome");
});

test("home slider text create rejects empty and oversized text", async () => {
  const service = new HomeSliderTextsService({});

  await assert.rejects(service.create({ text: "  " }), {
    status: 400,
  });
  await assert.rejects(service.create({ text: "x".repeat(201) }), {
    status: 400,
  });
});

test("home slider text update returns null for missing ids and updates timestamps", async () => {
  let update;
  let returningCalls = 0;
  const row = sliderTextRow({ text: "Updated text" });
  const service = new HomeSliderTextsService({
    update(table) {
      assert.equal(table, homeSliderTextEntries);
      return {
        set(values) {
          update = values;
          return this;
        },
        where() {
          return {
            returning: async () => (++returningCalls === 1 ? [] : [row]),
          };
        },
      };
    },
  });

  assert.equal(await service.update("missing", { active: false }), null);
  assert.equal(update.active, false);
  assert.equal(
    (await service.update(row.id, { text: "Updated text" })).text,
    row.text,
  );
  assert.equal(update.text, "Updated text");
  assert.ok(update.updatedAt instanceof Date);
});

test("home slider text reorder rejects non-array input and updates requested entries transactionally", async () => {
  const updates = [];
  const transaction = {
    update: (table) => ({
      set: (values) => ({
        where: async () => updates.push({ table, values }),
      }),
    }),
  };
  const service = new HomeSliderTextsService({
    transaction: async (callback) => callback(transaction),
  });

  await assert.rejects(service.reorder(null), { status: 400 });
  await service.reorder([{ id: "slider-id", sortOrder: 2 }]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].table, homeSliderTextEntries);
  assert.equal(updates[0].values.sortOrder, 2);
});

function sliderTextRow(overrides = {}) {
  return {
    id: "0123456789abcdef01234567",
    text: "Welcome",
    active: true,
    sortOrder: 1,
    createdBy: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

function serializeExpected(row) {
  return {
    _id: row.id,
    text: row.text,
    active: row.active,
    sortOrder: row.sortOrder,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
