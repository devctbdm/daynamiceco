import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { physicalStoreEntries } from "../src/models/PhysicalStore.js";
import { physicalStoreBannerSettings } from "../src/models/PhysicalStoreSetting.js";
import {
  normalizePhones,
  PhysicalStoresService,
  serializeSetting,
} from "../src/physical-stores/physical-stores.service.js";

test("physical store tables define normalized store and banner settings data", () => {
  const stores = getTableConfig(physicalStoreEntries);
  const settings = getTableConfig(physicalStoreBannerSettings);

  assert.equal(stores.name, "physical_store_entries");
  assert.deepEqual(
    stores.columns.map((column) => column.name),
    [
      "id",
      "title",
      "address",
      "description",
      "phones",
      "open_time",
      "close_time",
      "off_day",
      "map_url",
      "active",
      "sort_order",
      "created_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.ok(
    stores.indexes.some(
      (index) =>
        index.config.name === "physical_store_entries_active_sort_order_idx",
    ),
  );
  assert.equal(settings.name, "physical_store_banner_settings");
  assert.equal(settings.columns[0].primary, true);
});

test("physical store phone data accepts JSON multipart arrays and trims fields", () => {
  assert.deepEqual(
    normalizePhones(
      JSON.stringify([
        { label: "  Main ", number: " 555 " },
        { label: "", number: "" },
      ]),
    ),
    [{ label: "Main", number: "555" }],
  );
  assert.deepEqual(normalizePhones("not-json"), []);
});

test("physical store banner settings return the legacy storefront shape", () => {
  assert.deepEqual(
    serializeSetting(
      {
        enabled: true,
        title: "Stores",
        subtitle: "",
        description: "",
        buttonLabel: "",
        buttonLink: "/physical-stores",
        bannerUrl: "",
        showCount: true,
        countSuffix: "+",
      },
      4,
    ),
    {
      enabled: true,
      title: "Stores",
      subtitle: "",
      description: "",
      buttonLabel: "",
      buttonLink: "/physical-stores",
      bannerUrl: "",
      showCount: true,
      countSuffix: "+",
      count: 4,
    },
  );
});

test("physical store creation rejects an empty title before database writes", async () => {
  const service = new PhysicalStoresService({
    insert() {
      assert.fail("Invalid store title must not reach the database");
    },
  });

  await assert.rejects(service.create({ title: " " }), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.deepEqual(error.getResponse(), {
      success: false,
      message: "Store title is required",
    });
    return true;
  });
});
