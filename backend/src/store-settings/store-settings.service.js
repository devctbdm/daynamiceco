import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE } from "../db/database.js";
import {
  serializeStoreSettings,
  storeSettings,
} from "../models/StoreSetting.js";

const FIELDS = [
  "storeName",
  "storeUrl",
  "email",
  "phone",
  "description",
  "logoText",
  "logoSubText",
  "logoIconUrl",
  "logoUrl",
  "currency",
  "timezone",
  "address",
  "metaTitle",
  "metaDescription",
];

class StoreSettingsService {
  constructor(database) {
    this.database = database;
  }

  async getSettings() {
    const [settings] = await this.database
      .insert(storeSettings)
      .values({ id: "default" })
      .onConflictDoNothing({ target: storeSettings.id })
      .returning();
    if (settings) return serializeStoreSettings(settings);

    const [existing] = await this.database
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, "default"))
      .limit(1);
    if (!existing) throw new Error("Failed to load store settings");
    return serializeStoreSettings(existing);
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    return Object.fromEntries(
      [
        "storeName",
        "storeUrl",
        "email",
        "phone",
        "description",
        "logoType",
        "logoText",
        "logoSubText",
        "logoIconUrl",
        "logoUrl",
        "currency",
        "timezone",
        "address",
        "metaTitle",
        "metaDescription",
      ].map((field) => [field, settings[field]]),
    );
  }

  async updateSettings(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestException("Settings must be an object");
    }

    const updates = {};
    for (const field of FIELDS) {
      if (input[field] === undefined) continue;
      if (typeof input[field] !== "string") {
        throw new BadRequestException(`${field} must be a string`);
      }
      updates[field] = input[field];
    }
    if (input.logoType !== undefined) {
      if (typeof input.logoType !== "string") {
        throw new BadRequestException("logoType must be a string");
      }
      updates.logoType = input.logoType === "image" ? "image" : "text";
    }

    const [settings] = await this.database
      .insert(storeSettings)
      .values({ id: "default", ...updates })
      .onConflictDoUpdate({
        target: storeSettings.id,
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();
    if (!settings) throw new Error("Failed to save store settings");
    return serializeStoreSettings(settings);
  }
}

Injectable()(StoreSettingsService);
Inject(DATABASE)(StoreSettingsService, undefined, 0);

export { StoreSettingsService };
