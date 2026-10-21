import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { serviceFinderEntries } from "../models/ServiceFinder.js";
import { serviceFinderSettings } from "../models/ServiceFinderSetting.js";

const MAX_TITLE = 80;
const MAX_SUBTITLE = 160;
const MAX_ICON = 40;
const MAX_HREF = 300;
const DEFAULT_ICON = "sparkles";

class ServiceFindersService {
  constructor(database) {
    this.database = database;
  }

  async getSetting() {
    await this.database
      .insert(serviceFinderSettings)
      .values({ id: "default" })
      .onConflictDoNothing({ target: serviceFinderSettings.id });

    const [setting] = await this.database
      .select({ enabled: serviceFinderSettings.enabled })
      .from(serviceFinderSettings)
      .where(eq(serviceFinderSettings.id, "default"))
      .limit(1);

    if (!setting) {
      throw new Error("Failed to load service finder setting");
    }
    return setting;
  }

  async updateSetting(input) {
    const enabled = typeof input?.enabled === "boolean" ? input.enabled : null;

    const [setting] = await this.database
      .insert(serviceFinderSettings)
      .values({
        id: "default",
        ...(enabled === null ? {} : { enabled }),
      })
      .onConflictDoUpdate({
        target: serviceFinderSettings.id,
        set: {
          ...(enabled === null ? {} : { enabled }),
          updatedAt: new Date(),
        },
      })
      .returning({ enabled: serviceFinderSettings.enabled });

    if (!setting) {
      throw new Error("Failed to update service finder setting");
    }
    return setting;
  }

  async findAll(activeOnly) {
    let query = this.database
      .select()
      .from(serviceFinderEntries)
      .orderBy(
        asc(serviceFinderEntries.sortOrder),
        asc(serviceFinderEntries.createdAt),
      );
    if (activeOnly) {
      query = query.where(eq(serviceFinderEntries.active, true));
    }

    return (await query).map(serializeItem);
  }

  async findById(id) {
    const [row] = await this.database
      .select()
      .from(serviceFinderEntries)
      .where(eq(serviceFinderEntries.id, id))
      .limit(1);
    return row ? serializeItem(row) : null;
  }

  async create(input, userId) {
    const fields = {
      title: requiredTitle(input?.title),
      subtitle: optionalText(input?.subtitle, "Subtitle", MAX_SUBTITLE),
      icon: iconValue(input?.icon),
      href: hrefValue(input?.href),
      active: input?.active === undefined ? true : Boolean(input.active),
      sortOrder: sortOrderValue(input?.sortOrder),
    };

    const [row] = await this.database
      .insert(serviceFinderEntries)
      .values({
        id: randomBytes(12).toString("hex"),
        ...fields,
        createdBy: userId ? String(userId) : null,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create service finder card");
    }
    return serializeItem(row);
  }

  async update(id, input) {
    const updates = { updatedAt: new Date() };
    if (input?.title !== undefined) updates.title = requiredTitle(input.title);
    if (input?.subtitle !== undefined) {
      updates.subtitle = optionalText(input.subtitle, "Subtitle", MAX_SUBTITLE);
    }
    if (input?.icon !== undefined) updates.icon = iconValue(input.icon);
    if (input?.href !== undefined) updates.href = hrefValue(input.href);
    if (input?.active !== undefined) updates.active = Boolean(input.active);
    if (input?.sortOrder !== undefined) {
      updates.sortOrder = sortOrderValue(input.sortOrder);
    }

    const [row] = await this.database
      .update(serviceFinderEntries)
      .set(updates)
      .where(eq(serviceFinderEntries.id, id))
      .returning();

    return row ? serializeItem(row) : null;
  }

  async delete(id) {
    const [row] = await this.database
      .delete(serviceFinderEntries)
      .where(eq(serviceFinderEntries.id, id))
      .returning({ id: serviceFinderEntries.id });
    return Boolean(row);
  }

  async reorder(orders) {
    if (!Array.isArray(orders)) {
      throw invalidField("Orders must be an array");
    }

    const normalized = orders.map((entry) => {
      if (!entry || typeof entry.id !== "string" || !entry.id.trim()) {
        throw invalidField("Each order requires an id");
      }
      return { id: entry.id, sortOrder: sortOrderValue(entry.sortOrder) };
    });

    await this.database.transaction(async (transaction) => {
      for (const { id, sortOrder } of normalized) {
        await transaction
          .update(serviceFinderEntries)
          .set({ sortOrder, updatedAt: new Date() })
          .where(eq(serviceFinderEntries.id, id));
      }
    });
  }
}

function requiredTitle(value) {
  if (value === undefined || value === null || !String(value).trim()) {
    throw invalidField("Title is required");
  }
  const title = String(value).trim();
  if (title.length > MAX_TITLE) {
    throw invalidField(`Title cannot exceed ${MAX_TITLE} characters`);
  }
  return title;
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (text.length > maxLength) {
    throw invalidField(`${field} cannot exceed ${maxLength} characters`);
  }
  return text;
}

function iconValue(value) {
  const icon = optionalText(value, "Icon", MAX_ICON);
  return icon || DEFAULT_ICON;
}

function hrefValue(value) {
  const href = optionalText(value, "Link", MAX_HREF);
  if (!href) return "";
  if (!/^(\/|https?:\/\/|mailto:|tel:)/i.test(href)) {
    throw invalidField("Link must start with '/', http(s)://, mailto: or tel:");
  }
  return href;
}

function sortOrderValue(value) {
  if (value === undefined || value === null || value === "") return 0;
  const sortOrder = Number(value);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw invalidField("Sort order must be a non-negative integer");
  }
  return sortOrder;
}

function invalidField(message) {
  return new BadRequestException({ success: false, message });
}

function serializeItem(row) {
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

Injectable()(ServiceFindersService);
Inject(DATABASE)(ServiceFindersService, undefined, 0);

export { ServiceFindersService };
