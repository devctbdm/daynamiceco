import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { homeSliderTextEntries } from "../models/HomeSliderText.js";

class HomeSliderTextsService {
  constructor(database) {
    this.database = database;
  }

  async findAll(activeOnly) {
    let query = this.database
      .select()
      .from(homeSliderTextEntries)
      .orderBy(
        asc(homeSliderTextEntries.sortOrder),
        asc(homeSliderTextEntries.createdAt),
      );
    if (activeOnly) {
      query = query.where(eq(homeSliderTextEntries.active, true));
    }

    return (await query).map(serializeText);
  }

  async findById(id) {
    const [row] = await this.database
      .select()
      .from(homeSliderTextEntries)
      .where(eq(homeSliderTextEntries.id, id))
      .limit(1);
    return row ? serializeText(row) : null;
  }

  async create(input, userId) {
    const fields = validateFields(input, true);
    const [row] = await this.database
      .insert(homeSliderTextEntries)
      .values({
        id: randomBytes(12).toString("hex"),
        ...fields,
        createdBy: userId ?? null,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create home slider text");
    }
    return serializeText(row);
  }

  async update(id, input) {
    const fields = validateFields(input, false);
    const [row] = await this.database
      .update(homeSliderTextEntries)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(homeSliderTextEntries.id, id))
      .returning();

    return row ? serializeText(row) : null;
  }

  async delete(id) {
    const [row] = await this.database
      .delete(homeSliderTextEntries)
      .where(eq(homeSliderTextEntries.id, id))
      .returning({ id: homeSliderTextEntries.id });
    return Boolean(row);
  }

  async reorder(orders) {
    if (!Array.isArray(orders)) {
      throw new BadRequestException({
        success: false,
        message: "Orders must be an array",
      });
    }

    const normalizedOrders = orders.map((entry) => {
      if (!entry || typeof entry.id !== "string" || !entry.id.trim()) {
        throw invalidField("Each order requires an id");
      }
      return {
        id: entry.id,
        sortOrder: normalizeSortOrder(entry.sortOrder),
      };
    });

    await this.database.transaction(async (transaction) => {
      for (const { id, sortOrder } of normalizedOrders) {
        await transaction
          .update(homeSliderTextEntries)
          .set({ sortOrder, updatedAt: new Date() })
          .where(eq(homeSliderTextEntries.id, id));
      }
    });
  }
}

function validateFields(input, creating) {
  const fields = {};

  if (creating || input?.text !== undefined) {
    if (typeof input?.text !== "string") {
      throw invalidField("Text is required");
    }
    const text = input.text.trim();
    if (!text) {
      throw invalidField("Text is required");
    }
    if (text.length > 200) {
      throw invalidField("Text cannot exceed 200 characters");
    }
    fields.text = text;
  }

  if (creating || input?.active !== undefined) {
    fields.active =
      creating && input?.active === undefined ? true : Boolean(input.active);
  }

  if (creating || input?.sortOrder !== undefined) {
    fields.sortOrder =
      creating && !input?.sortOrder ? 0 : normalizeSortOrder(input.sortOrder);
  }

  return fields;
}

function normalizeSortOrder(value) {
  const sortOrder = Number(value);
  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    throw invalidField("Sort order cannot be negative");
  }
  return sortOrder;
}

function invalidField(message) {
  return new BadRequestException({ success: false, message });
}

function serializeText(row) {
  return {
    _id: row.id,
    text: row.text,
    active: row.active,
    sortOrder: row.sortOrder,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

Injectable()(HomeSliderTextsService);
Inject(DATABASE)(HomeSliderTextsService, undefined, 0);

export { HomeSliderTextsService };
