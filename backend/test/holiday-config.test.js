import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  defaultHolidayConfig,
  holidaySettings,
} from "../src/models/HolidayConfig.js";
import { HolidayService } from "../src/holidays/holiday.service.js";

test("holiday settings use a normalized singleton table", () => {
  const config = getTableConfig(holidaySettings);

  assert.equal(config.name, "holiday_settings");
  assert.equal(config.columns[0].name, "key");
  assert.equal(config.columns[0].primary, true);
  assert.deepEqual(defaultHolidayConfig(), {
    key: "default",
    heroBadge: "Special Holiday Offer",
    title: "Mega Offer",
    subtitle:
      "Celebrate the season with amazing deals on your favorite products!",
    discountPercent: 70,
    endDate: "2026-12-31T23:59:59",
    couponCode: "HOLIDAY10",
    couponDescription:
      "Use the code below at checkout and stack your savings on top of holiday prices.",
    topDealsTitle: "Top Holiday Deals",
    topDealsSubtitle:
      "Hand-picked favorites at their lowest prices of the year.",
    active: true,
  });
});

test("holiday read returns defaults when no config exists", async () => {
  const database = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
  };

  assert.deepEqual(await new HolidayService(database).getConfig(), {
    ...defaultHolidayConfig(),
  });
});

test("holiday update normalizes partial values and upserts the singleton", async () => {
  let values;
  let conflict;
  const saved = { key: "default", discountPercent: 25, active: true };
  const database = {
    insert(table) {
      assert.equal(table, holidaySettings);
      return {
        values(row) {
          values = row;
          return this;
        },
        onConflictDoUpdate(config) {
          conflict = config;
          return this;
        },
        returning: async () => [saved],
      };
    },
  };
  const result = await new HolidayService(database).updateConfig({
    discountPercent: "25",
    active: "true",
    title: "Season sale",
    unknownField: "ignored",
  });

  assert.deepEqual(result, saved);
  assert.equal(values.key, "default");
  assert.equal(values.discountPercent, 25);
  assert.equal(values.active, true);
  assert.equal(values.title, "Season sale");
  assert.equal("unknownField" in values, false);
  assert.ok(conflict.set.updatedAt instanceof Date);
});

test("holiday update rejects invalid end dates", async () => {
  const service = new HolidayService({});
  await assert.rejects(
    service.updateConfig({ endDate: "not-a-date" }),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.message, "endDate must be a valid date");
      return true;
    },
  );
});
