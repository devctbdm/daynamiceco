import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DATABASE } from "../db/database.js";
import {
  savedBuildEntries,
  serializeSavedBuild,
} from "../models/SavedBuild.js";
import { findProductsByIds } from "../products/products.repository.js";

class SavedBuildsService {
  constructor(database) {
    this.database = database;
  }

  async getMyBuilds(userId) {
    const rows = await this.database
      .select()
      .from(savedBuildEntries)
      .where(eq(savedBuildEntries.userId, userId))
      .orderBy(desc(savedBuildEntries.createdAt))
      .limit(100);
    return rows.map(serializeSavedBuild);
  }

  async saveBuild(userId, input = {}) {
    const { name, components } = input;
    if (!components || typeof components !== "object") {
      throw new BadRequestException({
        success: false,
        message: "components are required",
      });
    }

    const productIds = Object.values(components)
      .map((component) => component && component.product)
      .filter(Boolean)
      .map(String)
      .map((id) => id.toLowerCase());
    const products = await findProductsByIds(productIds, this.database);
    const productsById = new Map(
      products.map((product) => [product._id.toLowerCase(), product]),
    );
    const cleanComponents = {};

    for (const [slot, component] of Object.entries(components)) {
      if (!component || !component.product) continue;
      const product = productsById.get(String(component.product).toLowerCase());
      if (!product) continue;
      cleanComponents[slot] = {
        product: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        price:
          product.discountPrice > 0 ? product.discountPrice : product.price,
        wattage: product.pcPart?.wattage || 0,
      };
    }

    const buildName =
      typeof name === "string" && name.trim() ? name.trim() : "My PC Build";
    if (buildName.length > 80) {
      throw new BadRequestException({
        success: false,
        message: "Build name cannot be more than 80 characters",
      });
    }

    const [row] = await this.database
      .insert(savedBuildEntries)
      .values({
        id: randomUUID(),
        userId,
        name: buildName,
        components: cleanComponents,
      })
      .returning();
    if (!row) throw new Error("Failed to save PC build");
    return serializeSavedBuild(row);
  }

  async deleteBuild(userId, id) {
    const [row] = await this.database
      .delete(savedBuildEntries)
      .where(
        and(eq(savedBuildEntries.id, id), eq(savedBuildEntries.userId, userId)),
      )
      .returning({ id: savedBuildEntries.id });
    if (!row) {
      throw new NotFoundException({
        success: false,
        message: "Build not found",
      });
    }
  }
}

Injectable()(SavedBuildsService);
Inject(DATABASE)(SavedBuildsService, undefined, 0);

export { SavedBuildsService };
