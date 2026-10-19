import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { homeSliderSettings } from "../src/models/HomeSliderSetting.js";
import { HomeSliderSettingsService } from "../src/home-slider-settings/home-slider-settings.service.js";

test("home slider setting has a default-enabled singleton table", () => {
  const config = getTableConfig(homeSliderSettings);

  assert.equal(config.name, "home_slider_text_settings");
  assert.equal(config.columns[0].name, "id");
  assert.equal(config.columns[0].primary, true);
  assert.equal(
    config.columns.find((column) => column.name === "enabled").default,
    true,
  );
});

test("home slider setting read creates default row and returns enabled state", async () => {
  const calls = [];
  const database = {
    insert(table) {
      calls.push(["insert", table]);
      return {
        values: (row) => {
          calls.push(["values", row]);
          return {
            onConflictDoNothing: (conflict) => {
              calls.push(["onConflictDoNothing", conflict]);
              return Promise.resolve();
            },
          };
        },
      };
    },
    select: (selection) => {
      calls.push(["select", selection]);
      return {
        from: (table) => {
          calls.push(["from", table]);
          return {
            where: () => ({
              limit: async () => [{ enabled: true }],
            }),
          };
        },
      };
    },
  };

  assert.deepEqual(await new HomeSliderSettingsService(database).getSetting(), {
    enabled: true,
  });
  assert.equal(calls[0][0], "insert");
  assert.deepEqual(calls[1][1], { id: "default" });
});

test("home slider setting update preserves an omitted enabled value", async () => {
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
      returning: async () => [{ enabled: true }],
    }),
  };

  assert.deepEqual(
    await new HomeSliderSettingsService(database).updateSetting({
      enabled: "false",
    }),
    { enabled: true },
  );
  assert.deepEqual(values, { id: "default" });
  assert.ok(conflict.set.updatedAt instanceof Date);
  assert.equal("enabled" in conflict.set, false);
});

test("home slider setting update saves explicit boolean values", async () => {
  let values;
  const database = {
    insert: () => ({
      values(row) {
        values = row;
        return this;
      },
      onConflictDoUpdate() {
        return this;
      },
      returning: async () => [{ enabled: false }],
    }),
  };

  assert.deepEqual(
    await new HomeSliderSettingsService(database).updateSetting({
      enabled: false,
    }),
    { enabled: false },
  );
  assert.deepEqual(values, { id: "default", enabled: false });
});
