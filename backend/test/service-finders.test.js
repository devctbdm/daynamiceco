import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { serviceFinderEntries } from "../src/models/ServiceFinder.js";
import { serviceFinderSettings } from "../src/models/ServiceFinderSetting.js";
import { ServiceFindersService } from "../src/service-finders/service-finders.service.js";

test("service finder entries use a normalized table and indexed ordering", () => {
  const config = getTableConfig(serviceFinderEntries);

  assert.equal(config.name, "service_finder_entries");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [
      "id",
      "title",
      "subtitle",
      "icon",
      "href",
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
    "service_finder_entries_active_sort_order_idx",
  );
});

test("service finder list optionally filters active rows and serializes Mongo-compatible ids", async () => {
  let where;
  let order;
  const row = finderRow();
  const service = new ServiceFindersService({
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

test("service finder create trims copy, applies defaults, and generates an ObjectId-shaped id", async () => {
  let inserted;
  const row = finderRow({
    title: "Laptop Finder",
    subtitle: "Find the perfect laptop",
    icon: "laptop",
    sortOrder: 2,
    createdBy: "admin-id",
  });
  const service = new ServiceFindersService({
    insert(table) {
      assert.equal(table, serviceFinderEntries);
      return {
        values(values) {
          inserted = values;
          return this;
        },
        returning: async () => [{ ...row, id: inserted.id }],
      };
    },
  });

  const created = await service.create(
    {
      title: "  Laptop Finder  ",
      subtitle: "  Find the perfect laptop  ",
      icon: "laptop",
      sortOrder: 2,
    },
    "admin-id",
  );

  assert.equal(inserted.title, "Laptop Finder");
  assert.equal(inserted.subtitle, "Find the perfect laptop");
  assert.equal(inserted.icon, "laptop");
  assert.equal(inserted.href, "");
  assert.equal(inserted.active, true);
  assert.equal(inserted.sortOrder, 2);
  assert.equal(inserted.createdBy, "admin-id");
  assert.match(created._id, /^[a-f\d]{24}$/);
  assert.equal(created.icon, "laptop");
});

test("service finder create falls back to the default icon and rejects invalid fields", async () => {
  let inserted;
  const service = new ServiceFindersService({
    insert: () => ({
      values(values) {
        inserted = values;
        return this;
      },
      returning: async () => [finderRow({ ...inserted, id: inserted.id })],
    }),
  });

  const created = await service.create({ title: "Service center" });
  assert.equal(inserted.icon, "sparkles");
  assert.equal(created.icon, "sparkles");

  const invalid = new ServiceFindersService({});
  await assert.rejects(invalid.create({ title: "   " }), { status: 400 });
  await assert.rejects(invalid.create({ title: "x".repeat(81) }), {
    status: 400,
  });
  await assert.rejects(
    invalid.create({ title: "Valid", subtitle: "x".repeat(161) }),
    { status: 400 },
  );
  await assert.rejects(
    invalid.create({ title: "Valid", href: "javascript:alert(1)" }),
    { status: 400 },
  );
  await assert.rejects(invalid.create({ title: "Valid", sortOrder: -1 }), {
    status: 400,
  });
});

test("service finder update returns null for missing ids and stamps updatedAt", async () => {
  let update;
  let returningCalls = 0;
  const row = finderRow({ title: "Service center", active: false });
  const service = new ServiceFindersService({
    update(table) {
      assert.equal(table, serviceFinderEntries);
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

  const updated = await service.update(row.id, { href: "/pc-builders" });
  assert.equal(update.href, "/pc-builders");
  assert.equal(updated.href, row.href);
  assert.ok(update.updatedAt instanceof Date);
});

test("service finder delete reports whether a row was removed", async () => {
  let deleted = 0;
  const service = new ServiceFindersService({
    delete: () => ({
      where: () => ({
        returning: async () => (++deleted === 1 ? [{ id: "x" }] : []),
      }),
    }),
  });

  assert.equal(await service.delete("x"), true);
  assert.equal(await service.delete("missing"), false);
});

test("service finder reorder rejects non-array input and updates requested entries transactionally", async () => {
  const updates = [];
  const transaction = {
    update: (table) => ({
      set: (values) => ({
        where: async () => updates.push({ table, values }),
      }),
    }),
  };
  const service = new ServiceFindersService({
    transaction: async (callback) => callback(transaction),
  });

  await assert.rejects(service.reorder(null), { status: 400 });
  await assert.rejects(service.reorder([{ sortOrder: 1 }]), { status: 400 });
  await service.reorder([
    { id: "card-a", sortOrder: 1 },
    { id: "card-b", sortOrder: 0 },
  ]);

  assert.equal(updates.length, 2);
  assert.equal(updates[0].table, serviceFinderEntries);
  assert.equal(updates[0].values.sortOrder, 1);
  assert.equal(updates[1].values.sortOrder, 0);
});

function finderRow(overrides = {}) {
  return {
    id: "0123456789abcdef01234567",
    title: "Laptop Finder",
    subtitle: "Find the perfect laptop for your needs",
    icon: "laptop",
    href: "",
    active: true,
    sortOrder: 0,
    createdBy: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

function serializeExpected(row) {
  return {
    _id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    icon: row.icon,
    href: row.href,
    active: row.active,
    sortOrder: row.sortOrder,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

test("service finder section setting is a default-enabled singleton table", () => {
  const config = getTableConfig(serviceFinderSettings);

  assert.equal(config.name, "service_finder_settings");
  assert.equal(config.columns[0].name, "id");
  assert.equal(config.columns[0].primary, true);
  assert.equal(
    config.columns.find((column) => column.name === "enabled").default,
    true,
  );
});

test("service finder section setting read creates the default row", async () => {
  const calls = [];
  const database = {
    insert(table) {
      calls.push(["insert", table]);
      return {
        values: (row) => {
          calls.push(["values", row]);
          return {
            onConflictDoNothing: () => Promise.resolve(),
          };
        },
      };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ enabled: true }],
        }),
      }),
    }),
  };

  assert.deepEqual(await new ServiceFindersService(database).getSetting(), {
    enabled: true,
  });
  assert.equal(calls[0][0], "insert");
  assert.deepEqual(calls[1][1], { id: "default" });
});

test("service finder section setting update saves explicit booleans and ignores the rest", async () => {
  let values;
  let conflict;
  const database = {
    insert: () => ({
      values(row) {
        values = row;
        return this;
      },
      onConflictDoUpdate(config) {
        conflict = config;
        return this;
      },
      returning: async () => [{ enabled: false }],
    }),
  };
  const service = new ServiceFindersService(database);

  assert.deepEqual(await service.updateSetting({ enabled: false }), {
    enabled: false,
  });
  assert.deepEqual(values, { id: "default", enabled: false });

  await service.updateSetting({ enabled: "nope" });
  assert.deepEqual(values, { id: "default" });
  assert.equal("enabled" in conflict.set, false);
  assert.ok(conflict.set.updatedAt instanceof Date);
});
