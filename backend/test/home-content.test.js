import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { homePageContent } from "../src/models/HomeContent.js";
import { HomeContentService } from "../src/home-content/home-content.service.js";

test("home content uses a dedicated normalized singleton table", () => {
  const config = getTableConfig(homePageContent);

  assert.equal(config.name, "home_page_content");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    ["id", "content", "enabled", "updated_by", "created_at", "updated_at"],
  );
  assert.equal(config.columns[0].primary, true);
});

test("home content read uses legacy defaults when no row exists", async () => {
  const service = new HomeContentService({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
  });

  assert.deepEqual(await service.getContent(), {
    _id: null,
    content: "",
    enabled: true,
    createdAt: null,
    updatedAt: null,
  });
});

test("home content upsert preserves partial fields and response shape", async () => {
  let insertValues;
  let updateConfig;
  const saved = {
    id: "default",
    content: "<p>Seasonal message</p>",
    enabled: false,
    updatedBy: "admin-1",
    createdAt: new Date(0),
    updatedAt: new Date(1),
  };
  const service = new HomeContentService({
    insert(table) {
      assert.equal(table, homePageContent);
      return {
        values(values) {
          insertValues = values;
          return this;
        },
        onConflictDoUpdate(config) {
          updateConfig = config;
          return this;
        },
        returning: async () => [saved],
      };
    },
  });

  assert.deepEqual(
    await service.upsertContent(
      { content: saved.content, enabled: false, ignored: "value" },
      "admin-1",
    ),
    {
      _id: "default",
      content: saved.content,
      enabled: false,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    },
  );
  assert.equal(insertValues.id, "default");
  assert.equal(insertValues.updatedBy, "admin-1");
  assert.equal("ignored" in insertValues, false);
  assert.ok(updateConfig.set.updatedAt instanceof Date);
});

test("home content delete only removes the singleton row", async () => {
  let deletedTable;
  let condition;
  const service = new HomeContentService({
    delete(table) {
      deletedTable = table;
      return {
        where: async (where) => {
          condition = where;
        },
      };
    },
  });

  await service.deleteContent();
  assert.equal(deletedTable, homePageContent);
  assert.ok(condition);
});
