import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import {
  computePromoItemDiscount,
  promoCodeEntries,
} from "../models/PromoCode.js";
import { expandPromoCategories } from "../utils/categoryTree.js";
import { findProductsByIds } from "../products/products.repository.js";

const PROMO_TYPES = new Set(["percentage", "fixed", "free_shipping"]);
const PROMO_STATUSES = new Set(["active", "inactive"]);

class PromosService {
  constructor(database) {
    this.database = database;
  }

  async validate(input) {
    const code = typeof input?.code === "string" ? input.code.trim() : "";
    if (!code) {
      throw new BadRequestException({
        success: false,
        message: "Promo code is required",
      });
    }
    const promo = await this.findByCode(code.toUpperCase());
    if (!promo) {
      throw new NotFoundException({
        success: false,
        message: "Invalid promo code",
      });
    }
    const items = Array.isArray(input.items) ? input.items : [];
    const products = await findProductsByIds(
      items.map((item) => item?.product).filter(Boolean),
      this.database,
    );
    const productsById = new Map(
      products.map((product) => [String(product._id), product]),
    );
    const promoItems = items.map((item) => {
      const product = productsById.get(String(item?.product));
      if (!product) {
        return { categories: [], price: 0, quantity: item?.quantity || 1 };
      }
      return {
        categories:
          product.categories.length > 0
            ? product.categories
            : product.category
              ? [product.category]
              : [],
        price:
          product.discountPrice > 0 ? product.discountPrice : product.price,
        quantity: item?.quantity || 1,
      };
    });
    const result = computePromoItemDiscount(
      promo,
      promoItems,
      Number(input.subtotal) || 0,
      await expandPromoCategories(promo.categories || []),
    );
    if (!result.valid) {
      const messages = {
        inactive: "This promo code is not active",
        "min-order": "Order does not meet the minimum amount",
        "no-category":
          "This promo code only applies to specific categories in your cart",
      };
      throw new BadRequestException({
        success: false,
        message:
          result.reason === "no-category"
            ? `This promo code is only valid for: ${
                promo.categories
                  .map((category) => String(category).trim())
                  .filter(Boolean)
                  .join(", ") || "specific categories"
              }`
            : messages[result.reason] || "This promo code cannot be applied",
        reason: result.reason,
        categories: promo.categories,
      });
    }
    return {
      success: true,
      promo: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        description: promo.description,
        minOrder: promo.minOrder,
        categories: promo.categories,
      },
      discount: result.discount,
      matchingSubtotal: result.matchingSubtotal,
    };
  }

  async findAll(query) {
    const page = positiveInteger(query.page, 1);
    const limit = positiveInteger(query.limit, 10);
    const conditions = [];
    if (query.status)
      conditions.push(eq(promoCodeEntries.status, query.status));
    if (query.type) conditions.push(eq(promoCodeEntries.type, query.type));
    if (query.search) {
      conditions.push(
        or(
          ilike(promoCodeEntries.code, `%${query.search}%`),
          ilike(promoCodeEntries.description, `%${query.search}%`),
        ),
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRow] = await this.database
      .select({ total: count() })
      .from(promoCodeEntries)
      .where(where);
    const promos = await this.database
      .select()
      .from(promoCodeEntries)
      .where(where)
      .orderBy(desc(promoCodeEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const total = Number(totalRow?.total ?? 0);
    return {
      success: true,
      count: promos.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      promos: promos.map(serializePromo),
    };
  }

  async getStats(now = new Date()) {
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [aggregate] = await this.database
      .select({
        total: count(),
        active: sql`count(*) filter (where ${promoCodeEntries.status} = 'active')`,
        inactive: sql`count(*) filter (where ${promoCodeEntries.status} = 'inactive')`,
        totalRedemptions: sql`coalesce(sum(${promoCodeEntries.usageCount}), 0)`,
      })
      .from(promoCodeEntries);
    const [expiring] = await this.database
      .select({ total: count() })
      .from(promoCodeEntries)
      .where(
        and(
          eq(promoCodeEntries.status, "active"),
          gte(promoCodeEntries.endDate, now),
          lte(promoCodeEntries.endDate, inSevenDays),
        ),
      );
    return {
      success: true,
      stats: {
        total: Number(aggregate?.total ?? 0),
        active: Number(aggregate?.active ?? 0),
        inactive: Number(aggregate?.inactive ?? 0),
        totalRedemptions: Number(aggregate?.totalRedemptions ?? 0),
        expiringSoon: Number(expiring?.total ?? 0),
      },
    };
  }

  async create(input, userId) {
    const values = normalizePromoInput(input, true);
    try {
      const [row] = await this.database
        .insert(promoCodeEntries)
        .values({
          id: randomBytes(12).toString("hex"),
          ...values,
          createdBy: userId ? String(userId) : null,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (!row) throw new Error("Failed to create promo code");
      return serializePromo(row);
    } catch (error) {
      if (error?.code === "23505") {
        throw promoConflict();
      }
      throw error;
    }
  }

  async update(id, input) {
    const [existing] = await this.database
      .select()
      .from(promoCodeEntries)
      .where(eq(promoCodeEntries.id, id))
      .limit(1);
    if (!existing) throw promoNotFound();
    const updates = normalizePromoInput(input, false, existing);
    updates.updatedAt = new Date();
    try {
      const [row] = await this.database
        .update(promoCodeEntries)
        .set(updates)
        .where(eq(promoCodeEntries.id, id))
        .returning();
      if (!row) throw promoNotFound();
      return serializePromo(row);
    } catch (error) {
      if (error?.code === "23505") throw promoConflict();
      if (error?.status) throw error;
      throw error;
    }
  }

  async delete(id) {
    const [row] = await this.database
      .delete(promoCodeEntries)
      .where(eq(promoCodeEntries.id, id))
      .returning({ id: promoCodeEntries.id });
    if (!row) throw promoNotFound();
  }

  async findByCode(code) {
    const [row] = await this.database
      .select()
      .from(promoCodeEntries)
      .where(eq(promoCodeEntries.code, code))
      .limit(1);
    return row ? serializePromo(row) : null;
  }
}

function normalizePromoInput(input = {}, creating, existing = {}) {
  const values = {};
  if (creating || input.code !== undefined) {
    const code =
      typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
    if (!code) throw badRequest("Promo code is required");
    if (code.length > 50)
      throw badRequest("Code cannot be more than 50 characters");
    values.code = code;
  }
  if (creating || input.description !== undefined) {
    const description = input.description ?? "";
    values.description = String(description).trim();
    if (values.description.length > 500) {
      throw badRequest("Description cannot be more than 500 characters");
    }
  }
  if (creating || input.type !== undefined) {
    values.type = input.type || existing.type || "percentage";
    if (!PROMO_TYPES.has(values.type)) throw badRequest("Invalid promo type");
  }
  if (creating || input.value !== undefined) {
    values.value = numericValue(
      input.value,
      "Please provide a discount value",
      0,
    );
    if (
      (values.type ?? existing.type ?? "percentage") === "percentage" &&
      values.value > 100
    ) {
      throw badRequest("Percentage value must be between 0 and 100");
    }
  }
  for (const [key, message, fallback] of [
    ["minOrder", "Minimum order cannot be negative", 0],
    ["maxDiscount", "Max discount cannot be negative", 0],
    ["maxUses", "Max uses cannot be negative", 0],
    ["perUserLimit", "Per-user limit cannot be negative", 1],
  ]) {
    if (creating || input[key] !== undefined) {
      values[key] =
        input[key] === undefined && creating
          ? fallback
          : numericValue(
              input[key] || (key === "perUserLimit" ? 1 : 0),
              message,
              0,
            );
    }
    const effectiveType = values.type ?? existing.type ?? "percentage";
    const effectiveValue = values.value ?? existing.value ?? 0;
    if (effectiveType === "percentage" && effectiveValue > 100) {
      throw badRequest("Percentage value must be between 0 and 100");
    }
  }
  for (const key of ["startDate", "endDate"]) {
    if (creating || input[key] !== undefined) {
      values[key] = normalizeDate(input[key], key);
    }
  }
  if (creating || input.status !== undefined) {
    values.status = input.status || existing.status || "active";
    if (!PROMO_STATUSES.has(values.status))
      throw badRequest("Invalid promo status");
  }
  if (creating || input.categories !== undefined) {
    values.categories = Array.isArray(input.categories)
      ? input.categories.filter((category) => typeof category === "string")
      : [];
  }
  return values;
}

function numericValue(value, message, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw badRequest(message);
  return number;
}

function normalizeDate(value, field) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`Invalid ${field}`);
  }
  return date;
}

function serializePromo(promo) {
  return { ...promo, _id: promo.id };
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function badRequest(message) {
  return new BadRequestException({ success: false, message });
}

function promoNotFound() {
  return new NotFoundException({
    success: false,
    message: "Promo code not found",
  });
}

function promoConflict() {
  return new BadRequestException({
    success: false,
    message: "Promo code already exists",
  });
}

Injectable()(PromosService);
Inject(DATABASE)(PromosService, undefined, 0);

export { PromosService, normalizePromoInput, serializePromo };
