import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DATABASE } from "../db/database.js";
import { productFilterSettings } from "../models/ProductFilterSettings.js";

class ProductFiltersService {
  constructor(database) {
    this.database = database;
  }

  async findAll() {
    return this.database
      .select()
      .from(productFilterSettings)
      .orderBy(asc(productFilterSettings.categoryId));
  }

  async upsert(input) {
    const categoryId = requiredString(input?.categoryId, "categoryId", 120);
    const brand =
      input?.brand == null
        ? ""
        : requiredString(input.brand, "brand", 120);
    const values = {
      price: requiredBoolean(input?.price, "price"),
      rating: requiredBoolean(input?.rating, "rating"),
      availability: requiredBoolean(input?.availability, "availability"),
      facets: normalizeFacets(input?.facets),
    };

    const [settings] = await this.database
      .insert(productFilterSettings)
      .values({ categoryId, brand, ...values, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [productFilterSettings.categoryId, productFilterSettings.brand],
        set: { ...values, updatedAt: new Date() },
      })
      .returning();

    if (!settings) throw new Error("Failed to save product filter settings");
    return settings;
  }

  async remove(categoryId, brand = "") {
    const [deleted] = await this.database
      .delete(productFilterSettings)
      .where(
        and(
          eq(productFilterSettings.categoryId, categoryId),
          eq(productFilterSettings.brand, brand),
        ),
      )
      .returning({ categoryId: productFilterSettings.categoryId });
    return Boolean(deleted);
  }
}

function requiredString(value, field, maxLength) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw new BadRequestException({
      success: false,
      message: `${field} must be a non-empty string of at most ${maxLength} characters`,
    });
  }
  return value.trim();
}

function requiredBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new BadRequestException({
      success: false,
      message: `${field} must be a boolean`,
    });
  }
  return value;
}

function normalizeFacets(facets) {
  if (
    !Array.isArray(facets) ||
    facets.length > 100 ||
    facets.some(
      (facet) =>
        typeof facet !== "string" ||
        facet.trim().length === 0 ||
        facet.trim().length > 100,
    )
  ) {
    throw new BadRequestException({
      success: false,
      message: "facets must be an array of up to 100 non-empty strings",
    });
  }
  return [...new Set(facets.map((facet) => facet.trim()))];
}

Injectable()(ProductFiltersService);
Inject(DATABASE)(ProductFiltersService, undefined, 0);

export { ProductFiltersService };
