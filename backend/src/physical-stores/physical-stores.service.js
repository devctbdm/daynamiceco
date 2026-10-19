import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { asc, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import {
  physicalStoreEntries,
  physicalStoreBannerSettings,
} from "../db/schema.js";

class PhysicalStoresService {
  constructor(database) {
    this.database = database;
  }

  async findAll(activeOnly) {
    let query = this.database
      .select()
      .from(physicalStoreEntries)
      .orderBy(
        asc(physicalStoreEntries.sortOrder),
        asc(physicalStoreEntries.createdAt),
      );
    if (activeOnly) {
      query = query.where(eq(physicalStoreEntries.active, true));
    }
    return (await query).map(serializeStore);
  }

  async findById(id) {
    const [store] = await this.database
      .select()
      .from(physicalStoreEntries)
      .where(eq(physicalStoreEntries.id, id))
      .limit(1);
    return store ? serializeStore(store) : null;
  }

  async create(input, userId) {
    const title = requiredTitle(input?.title);
    const store = {
      id: randomBytes(12).toString("hex"),
      title,
      address: stringValue(input?.address, "address", 300),
      description: stringValue(input?.description, "description", 300),
      phones: normalizePhones(input?.phones),
      openTime: stringValue(input?.openTime, "openTime", 40),
      closeTime: stringValue(input?.closeTime, "closeTime", 40),
      offDay: stringValue(input?.offDay, "offDay", 40),
      mapUrl: stringValue(input?.mapUrl, "mapUrl", 500),
      active: toBool(input?.active) ?? true,
      sortOrder: sortOrderValue(input?.sortOrder, 0),
      createdBy: userId ? String(userId) : null,
    };
    const [created] = await this.database
      .insert(physicalStoreEntries)
      .values(store)
      .returning();
    if (!created) throw new Error("Failed to create physical store");
    return serializeStore(created);
  }

  async update(id, input) {
    const [existing] = await this.database
      .select()
      .from(physicalStoreEntries)
      .where(eq(physicalStoreEntries.id, id))
      .limit(1);
    if (!existing) return null;

    const updates = { updatedAt: new Date() };
    if (input?.title !== undefined) updates.title = requiredTitle(input.title);
    for (const field of [
      "address",
      "description",
      "openTime",
      "closeTime",
      "offDay",
      "mapUrl",
    ]) {
      if (input?.[field] !== undefined) {
        const maxLength = {
          address: 300,
          description: 300,
          openTime: 40,
          closeTime: 40,
          offDay: 40,
          mapUrl: 500,
        }[field];
        updates[field] = stringValue(input[field], field, maxLength);
      }
    }
    if (input?.phones !== undefined)
      updates.phones = normalizePhones(input.phones);
    if (input?.active !== undefined) {
      const active = toBool(input.active);
      if (active === undefined) {
        throw new BadRequestException({
          success: false,
          message: "active must be a boolean",
        });
      }
      updates.active = active;
    }
    if (input?.sortOrder !== undefined) {
      updates.sortOrder = sortOrderValue(input.sortOrder, existing.sortOrder);
    }

    const [updated] = await this.database
      .update(physicalStoreEntries)
      .set(updates)
      .where(eq(physicalStoreEntries.id, id))
      .returning();
    return updated ? serializeStore(updated) : null;
  }

  async delete(id) {
    const [deleted] = await this.database
      .delete(physicalStoreEntries)
      .where(eq(physicalStoreEntries.id, id))
      .returning({ id: physicalStoreEntries.id });
    return Boolean(deleted);
  }

  async reorder(orders) {
    if (!Array.isArray(orders)) {
      throw new BadRequestException({
        success: false,
        message: "Orders must be an array",
      });
    }
    const normalized = orders.map((entry) => {
      if (!entry || typeof entry.id !== "string" || !entry.id) {
        throw new BadRequestException({
          success: false,
          message: "Each order must include a store id",
        });
      }
      return {
        id: entry.id,
        sortOrder: sortOrderValue(entry.sortOrder, 0),
      };
    });
    for (const { id, sortOrder } of normalized) {
      await this.database
        .update(physicalStoreEntries)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(physicalStoreEntries.id, id));
    }
  }

  async getSetting() {
    const [setting] = await this.database
      .select()
      .from(physicalStoreBannerSettings)
      .where(eq(physicalStoreBannerSettings.id, "default"))
      .limit(1);
    return serializeSetting(
      setting ?? defaultSetting(),
      await this.activeCount(),
    );
  }

  async updateSetting(input, image) {
    const [existing] = await this.database
      .select()
      .from(physicalStoreBannerSettings)
      .where(eq(physicalStoreBannerSettings.id, "default"))
      .limit(1);
    const values = { updatedAt: new Date() };
    const current = existing ?? defaultSetting();

    for (const [inputName, columnName] of [
      ["enabled", "enabled"],
      ["showCount", "showCount"],
    ]) {
      const value = toBool(input?.[inputName]);
      if (value !== undefined) values[columnName] = value;
    }
    for (const field of [
      "title",
      "subtitle",
      "description",
      "buttonLabel",
      "buttonLink",
      "countSuffix",
    ]) {
      if (typeof input?.[field] === "string") {
        values[field] =
          field === "countSuffix"
            ? input[field].trim().slice(0, 4)
            : input[field];
      }
    }
    if (image?.path) values.bannerUrl = image.path;
    else if (typeof input?.bannerUrl === "string") {
      values.bannerUrl = input.bannerUrl;
    }

    const [setting] = await this.database
      .insert(physicalStoreBannerSettings)
      .values({ ...current, ...values, id: "default" })
      .onConflictDoUpdate({
        target: physicalStoreBannerSettings.id,
        set: values,
      })
      .returning();
    if (!setting) throw new Error("Failed to update physical store setting");
    return serializeSetting(setting, await this.activeCount());
  }

  async activeCount() {
    const [result] = await this.database
      .select({ count: sql`count(*)::int` })
      .from(physicalStoreEntries)
      .where(eq(physicalStoreEntries.active, true));
    return result?.count ?? 0;
  }
}

function defaultSetting() {
  return {
    id: "default",
    enabled: true,
    title: "Physical Stores",
    subtitle: "Visit Our Store & Get Your Desired IT Product!",
    description: "",
    buttonLabel: "Find Our Stores",
    buttonLink: "/physical-stores",
    bannerUrl: "",
    showCount: true,
    countSuffix: "+",
  };
}

function serializeStore(store) {
  return { ...store, _id: store.id };
}

function serializeSetting(setting, count) {
  return {
    enabled: setting.enabled !== false,
    title: setting.title ?? "Physical Stores",
    subtitle: setting.subtitle ?? "",
    description: setting.description ?? "",
    buttonLabel: setting.buttonLabel ?? "",
    buttonLink: setting.buttonLink ?? "/physical-stores",
    bannerUrl: setting.bannerUrl ?? "",
    showCount: setting.showCount !== false,
    countSuffix: setting.countSuffix ?? "+",
    count,
  };
}

function requiredTitle(value) {
  if (value === undefined || value === null || !String(value).trim()) {
    throw new BadRequestException({
      success: false,
      message: "Store title is required",
    });
  }
  const title = String(value).trim();
  if (title.length > 120) {
    throw new BadRequestException({
      success: false,
      message: "Title cannot exceed 120 characters",
    });
  }
  return title;
}

function stringValue(value, field, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new BadRequestException({
      success: false,
      message: `${field} must be a string`,
    });
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new BadRequestException({
      success: false,
      message: `${field} cannot exceed ${maxLength} characters`,
    });
  }
  return result;
}

function normalizePhones(value) {
  let list = value;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((phone) => ({
      label: String(phone?.label ?? "")
        .trim()
        .slice(0, 40),
      number: String(phone?.number ?? "")
        .trim()
        .slice(0, 40),
    }))
    .filter((phone) => phone.label || phone.number);
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return undefined;
}

function sortOrderValue(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new BadRequestException({
      success: false,
      message: "Sort order cannot be negative and must be an integer",
    });
  }
  return number;
}

Injectable()(PhysicalStoresService);
Inject(DATABASE)(PhysicalStoresService, undefined, 0);

export {
  PhysicalStoresService,
  normalizePhones,
  serializeSetting,
  serializeStore,
};
