import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  serializeStoreSettings,
  storeSettings,
} from "../src/models/StoreSetting.js";
import { StoreSettingsService } from "../src/store-settings/store-settings.service.js";

test("store settings use a normalized singleton table with logo type constraint", () => {
  const table = getTableConfig(storeSettings);
  assert.equal(table.name, "store_setting_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "store_name",
      "store_url",
      "email",
      "phone",
      "description",
      "logo_type",
      "logo_text",
      "logo_sub_text",
      "logo_icon_url",
      "logo_url",
      "currency",
      "timezone",
      "address",
      "meta_title",
      "meta_description",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(table.columns[0].default, "default");
  assert.equal(table.columns[6].default, "text");
  assert.equal(table.checks.length, 2);
});

test("store setting serialization exposes the legacy _id alias", () => {
  const settings = serializeStoreSettings({
    id: "default",
    storeName: "Apple IT Zone",
    logoType: "text",
  });
  assert.equal(settings._id, "default");
  assert.equal(settings.id, "default");
  assert.equal(settings.storeName, "Apple IT Zone");
});

test("store settings lookup initializes and returns the singleton row", async () => {
  let inserted;
  const database = {
    insert() {
      return {
        values(value) {
          inserted = value;
          return this;
        },
        onConflictDoNothing() {
          return this;
        },
        returning: async () => [
          {
            id: "default",
            storeName: "",
            logoType: "text",
          },
        ],
      };
    },
  };
  const settings = await new StoreSettingsService(database).getSettings();
  assert.deepEqual(inserted, { id: "default" });
  assert.equal(settings._id, "default");
  assert.equal(settings.logoType, "text");
});

test("public store settings return only the legacy public fields", async () => {
  const service = new StoreSettingsService({});
  service.getSettings = async () => ({
    _id: "default",
    storeName: "Apple IT Zone",
    storeUrl: "https://example.test",
    email: "store@example.test",
    phone: "01234567890",
    description: "Store description",
    logoType: "image",
    logoText: "Apple",
    logoSubText: "IT Zone",
    logoIconUrl: "/icon.svg",
    logoUrl: "/logo.svg",
    currency: "bdt",
    timezone: "Asia/Dhaka",
    address: "Dhaka",
    metaTitle: "Apple IT Zone",
    metaDescription: "Store meta description",
    createdAt: new Date(),
  });

  assert.deepEqual(await service.getPublicSettings(), {
    storeName: "Apple IT Zone",
    storeUrl: "https://example.test",
    email: "store@example.test",
    phone: "01234567890",
    description: "Store description",
    logoType: "image",
    logoText: "Apple",
    logoSubText: "IT Zone",
    logoIconUrl: "/icon.svg",
    logoUrl: "/logo.svg",
    currency: "bdt",
    timezone: "Asia/Dhaka",
    address: "Dhaka",
    metaTitle: "Apple IT Zone",
    metaDescription: "Store meta description",
  });
});

test("store setting updates preserve omitted values and normalize logo type", async () => {
  let inserted;
  let conflictUpdate;
  const database = {
    insert() {
      return {
        values(value) {
          inserted = value;
          return this;
        },
        onConflictDoUpdate(value) {
          conflictUpdate = value;
          return this;
        },
        returning: async () => [
          {
            id: "default",
            storeName: "New Name",
            storeUrl: "https://example.test",
            logoType: "text",
            createdAt: new Date("2026-10-18T12:00:00.000Z"),
            updatedAt: inserted.updatedAt,
          },
        ],
      };
    },
  };

  const result = await new StoreSettingsService(database).updateSettings({
    storeName: "New Name",
    logoType: "not-a-supported-value",
  });
  assert.equal(inserted.id, "default");
  assert.equal(inserted.logoType, "text");
  assert.equal(conflictUpdate.set.storeName, "New Name");
  assert.equal(conflictUpdate.set.logoType, "text");
  assert.equal(result._id, "default");
});

test("store setting updates reject non-string values before database access", async () => {
  const service = new StoreSettingsService({
    insert() {
      assert.fail("Invalid setting values must not write to Neon");
    },
  });
  await assert.rejects(service.updateSettings({ storeName: 42 }), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.equal(error.getResponse().message, "storeName must be a string");
    return true;
  });
});
