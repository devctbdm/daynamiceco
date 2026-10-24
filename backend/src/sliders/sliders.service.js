import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { cloudinary } from "../middleware/upload.js";
import { serializeSlider, sliderEntries } from "../models/Slider.js";
import {
    serializeSliderSetting,
    sliderSettingEntries,
} from "../models/SliderSetting.js";

class SlidersService {
  constructor(database) {
    this.database = database;
  }

  async getAll(active) {
    let query = this.database
      .select()
      .from(sliderEntries)
      .orderBy(asc(sliderEntries.type), asc(sliderEntries.sortOrder));
    if (active === "true") query = query.where(eq(sliderEntries.active, true));
    const [rows, setting] = await Promise.all([query, this.getSettingRow()]);
    return {
      success: true,
      sliders: rows.map(serializeSlider),
      setting: pickSliderSettings(setting),
    };
  }

  async getById(id) {
    const [row] = await this.database
      .select()
      .from(sliderEntries)
      .where(eq(sliderEntries.id, id))
      .limit(1);
    return row ? serializeSlider(row) : null;
  }

  async create(input, file, userId) {
    const values = {
      id: randomBytes(12).toString("hex"),
      title: parseText(input.title, "title", 200, ""),
      description: parseText(input.description, "description", 500, ""),
      image: file?.path || parseText(input.image, "image", undefined, ""),
      link: parseText(input.link, "link", undefined, ""),
      type: parseType(input.type, "hero"),
      active: parseBoolean(input.active, true),
      sortOrder: parseSortOrder(input.sortOrder, 0),
      createdBy: userId ? String(userId) : null,
    };
    const [row] = await this.database
      .insert(sliderEntries)
      .values(values)
      .returning();
    if (!row) throw new Error("Failed to create slider");
    return serializeSlider(row);
  }

  async update(id, input, file) {
    const [existing] = await this.database
      .select()
      .from(sliderEntries)
      .where(eq(sliderEntries.id, id))
      .limit(1);
    if (!existing) return null;

    const updates = {};
    if (input.title !== undefined) {
      updates.title = parseText(input.title, "title", 200);
    }
    if (input.description !== undefined) {
      updates.description = parseText(input.description, "description", 500);
    }
    if (input.link !== undefined) {
      updates.link = parseText(input.link, "link");
    }
    if (input.type !== undefined) updates.type = parseType(input.type);
    if (input.active !== undefined) {
      updates.active = parseBoolean(input.active, existing.active);
    }
    if (input.sortOrder !== undefined) {
      updates.sortOrder = parseSortOrder(input.sortOrder, existing.sortOrder);
    }
    if (file) updates.image = file.path;
    else if (input.image !== undefined) {
      updates.image = parseText(input.image, "image");
    }
    updates.updatedAt = new Date();

    const [row] = await this.database
      .update(sliderEntries)
      .set(updates)
      .where(eq(sliderEntries.id, id))
      .returning();
    if (!row) return null;
    if (updates.image !== undefined && updates.image !== existing.image) {
      await deleteCloudinaryImage(existing.image);
    }
    return serializeSlider(row);
  }

  async delete(id) {
    const [row] = await this.database
      .delete(sliderEntries)
      .where(eq(sliderEntries.id, id))
      .returning();
    if (!row) return false;
    await deleteCloudinaryImage(row.image);
    return true;
  }

  async reorder(orders) {
    if (!Array.isArray(orders)) {
      throw badRequest("Orders must be an array");
    }
    const normalized = orders.map((order) => {
      if (!order || typeof order.id !== "string" || !order.id.trim()) {
        throw badRequest("Each order must include an id and sortOrder");
      }
      return {
        id: order.id,
        sortOrder: parseSortOrder(order.sortOrder),
      };
    });
    await this.database.transaction(async (transaction) => {
      for (const order of normalized) {
        await transaction
          .update(sliderEntries)
          .set({ sortOrder: order.sortOrder, updatedAt: new Date() })
          .where(eq(sliderEntries.id, order.id));
      }
    });
  }

  async getSetting() {
    const row = await this.getSettingRow();
    return pickSliderSettings(row);
  }

  async updateSetting(input = {}) {
    const existing = await this.getSettingRow();
    const updates = { updatedAt: new Date() };
    if (input.enabled !== undefined) {
      updates.enabled = parseSettingBoolean(input.enabled, "Enabled");
    }
    if (input.autoSlide !== undefined) {
      updates.autoSlide = parseSettingBoolean(input.autoSlide, "Auto-slide");
    }
    if (input.interval !== undefined) {
      const interval = Number(input.interval);
      if (!Number.isInteger(interval) || interval < 3 || interval > 10) {
        throw badRequest(
          "Auto-slide interval must be between 3 and 10 seconds",
        );
      }
      updates.interval = interval;
    }
    const [row] = await this.database
      .update(sliderSettingEntries)
      .set(updates)
      .where(eq(sliderSettingEntries.id, existing.id))
      .returning();
    if (!row) throw new Error("Failed to update slider setting");
    return pickSliderSettings(row);
  }

  async getSettingRow() {
    await this.database
      .insert(sliderSettingEntries)
      .values({ id: "default" })
      .onConflictDoNothing({ target: sliderSettingEntries.id });
    const [row] = await this.database
      .select()
      .from(sliderSettingEntries)
      .where(eq(sliderSettingEntries.id, "default"))
      .limit(1);
    if (!row) throw new Error("Failed to load slider setting");
    return serializeSliderSetting(row);
  }
}

function pickSliderSettings(setting) {
  return {
    enabled: setting.enabled,
    autoSlide: setting.autoSlide,
    interval: setting.interval,
    updatedAt: setting.updatedAt,
  };
}

function parseText(value, field, maxLength, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string`);
  }
  const text = value.trim();
  if (maxLength !== undefined && text.length > maxLength) {
    throw badRequest(`${field} cannot exceed ${maxLength} characters`);
  }
  return text;
}

function parseType(value, fallback) {
  const type = value === undefined || value === "" ? fallback : value;
  if (!["hero", "ad_top", "ad_bottom"].includes(type)) {
    throw badRequest("Invalid slider type");
  }
  return type;
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return value === true || value === "true";
}

function parseSettingBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw badRequest(`${label} must be a boolean`);
  }
  return value;
}

function parseSortOrder(value, fallback = 0) {
  if (value === undefined || value === "") return fallback;
  const sortOrder = Number(value);
  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    throw badRequest("Sort order must be a nonnegative number");
  }
  return sortOrder;
}

function badRequest(message) {
  return new BadRequestException({ success: false, message });
}

async function deleteCloudinaryImage(image) {
  if (!image?.includes("cloudinary")) return;
  const publicId = image.split("/").pop()?.split(".")[0];
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(`apple-it-zone/sliders/${publicId}`);
  } catch (error) {
    console.warn(
      "Could not delete slider image from Cloudinary:",
      error.message,
    );
  }
}

Injectable()(SlidersService);
Inject(DATABASE)(SlidersService, undefined, 0);

export { SlidersService };
