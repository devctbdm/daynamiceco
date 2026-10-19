import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { asc, eq, or } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import slugify from "slugify";
import { DATABASE } from "../db/database.js";
import { categoryEntries } from "../models/Category.js";
import { cacheDel, cacheWrap } from "../config/redis.js";
import { clearCategoryCache } from "../utils/categoryTree.js";
import { cloudinary } from "../middleware/upload.js";

class CategoriesService {
  constructor(database) {
    this.database = database;
  }

  async findAll() {
    return cacheWrap("categories:all", 600, async () => {
      const rows = await this.database
        .select()
        .from(categoryEntries)
        .orderBy(asc(categoryEntries.sortOrder), asc(categoryEntries.name));
      return rows.map(serializeCategory);
    });
  }

  async findById(id) {
    const [row] = await this.database
      .select()
      .from(categoryEntries)
      .where(eq(categoryEntries.id, id))
      .limit(1);
    return row ? serializeCategory(row) : null;
  }

  async create(input, files, userId) {
    const name = categoryName(input?.name);
    const id = randomBytes(12).toString("hex");
    let category;
    try {
      [category] = await this.database
        .insert(categoryEntries)
        .values({
          id,
          name,
          slug: categorySlug(name, id),
          description:
            input?.description === undefined
              ? ""
              : optionalString(input.description, "description"),
          parentId: normalizeParentId(input?.parentId),
          active: parseBoolean(input?.active, true),
          imageUrl:
            files?.image?.[0]?.path ||
            (input?.imageUrl === undefined
              ? ""
              : optionalString(input.imageUrl, "imageUrl")),
          bannerUrl:
            files?.banner?.[0]?.path ||
            (input?.bannerUrl === undefined
              ? ""
              : optionalString(input.bannerUrl, "bannerUrl")),
          featured: parseBoolean(input?.featured, false),
          sortOrder: parseInteger(input?.sortOrder, 0, "sortOrder"),
          color:
            input?.color === undefined
              ? "#0071e3"
              : optionalString(input.color, "color") || "#0071e3",
          createdBy: userId ? String(userId) : null,
        })
        .returning();
    } catch (error) {
      throw categoryWriteError(error);
    }

    if (!category) throw new Error("Failed to create category");
    await this.invalidateCategoryCache();
    return serializeCategory(category);
  }

  async update(id, input, files) {
    const [existing] = await this.database
      .select()
      .from(categoryEntries)
      .where(eq(categoryEntries.id, id))
      .limit(1);
    if (!existing) return null;

    const updates = {};
    if (input?.name !== undefined) {
      updates.name = categoryName(input.name);
      updates.slug = categorySlug(updates.name, id);
    }
    if (input?.description !== undefined) {
      updates.description = optionalString(input.description, "description");
    }
    if (input?.parentId !== undefined) {
      updates.parentId = normalizeParentId(input.parentId);
      if (updates.parentId === id) {
        throw new BadRequestException({
          success: false,
          message: "A category cannot be its own parent",
        });
      }
      await this.assertNoParentCycle(id, updates.parentId);
    }
    if (input?.active !== undefined) {
      updates.active = parseBoolean(input.active, existing.active);
    }
    if (input?.featured !== undefined) {
      updates.featured = parseBoolean(input.featured, existing.featured);
    }
    if (input?.sortOrder !== undefined) {
      updates.sortOrder = parseInteger(
        input.sortOrder,
        existing.sortOrder,
        "sortOrder",
      );
    }
    if (input?.color !== undefined) {
      updates.color = optionalString(input.color, "color");
    }

    const imageUrl = uploadedOrInput(files?.image?.[0], input?.imageUrl);
    const bannerUrl = uploadedOrInput(files?.banner?.[0], input?.bannerUrl);
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
    updates.updatedAt = new Date();

    let category;
    try {
      [category] = await this.database
        .update(categoryEntries)
        .set(updates)
        .where(eq(categoryEntries.id, id))
        .returning();
    } catch (error) {
      throw categoryWriteError(error);
    }
    if (!category) return null;

    if (imageUrl !== undefined && imageUrl !== existing.imageUrl) {
      await deleteCloudinaryImage(existing.imageUrl, "old category image");
    }
    if (bannerUrl !== undefined && bannerUrl !== existing.bannerUrl) {
      await deleteCloudinaryImage(existing.bannerUrl, "old category banner");
    }
    await this.invalidateCategoryCache();
    return serializeCategory(category);
  }

  async delete(id) {
    const [existing] = await this.database
      .select()
      .from(categoryEntries)
      .where(eq(categoryEntries.id, id))
      .limit(1);
    if (!existing) return false;

    const children = await this.database
      .select()
      .from(categoryEntries)
      .where(eq(categoryEntries.parentId, id));
    await this.database
      .delete(categoryEntries)
      .where(or(eq(categoryEntries.id, id), eq(categoryEntries.parentId, id)));

    for (const category of [existing, ...children]) {
      await deleteCloudinaryImage(category.imageUrl, "category image");
      await deleteCloudinaryImage(category.bannerUrl, "category banner");
    }
    await this.invalidateCategoryCache();
    return true;
  }

  async reorder(orders) {
    if (!Array.isArray(orders)) {
      throw new BadRequestException({
        success: false,
        message: "orders must be an array",
      });
    }

    const normalized = orders.map((entry) => {
      if (
        !entry ||
        typeof entry.id !== "string" ||
        !entry.id ||
        !Number.isSafeInteger(Number(entry.sortOrder))
      ) {
        throw new BadRequestException({
          success: false,
          message: "Each order must include an id and integer sortOrder",
        });
      }
      return { id: entry.id, sortOrder: Number(entry.sortOrder) };
    });

    for (const item of normalized) {
      await this.database
        .update(categoryEntries)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(categoryEntries.id, item.id));
    }
    await this.invalidateCategoryCache();
  }

  async assertNoParentCycle(id, parentId) {
    const visited = new Set();
    let currentId = parentId;
    while (currentId && !visited.has(currentId)) {
      if (currentId === id) {
        throw new BadRequestException({
          success: false,
          message: "Category parent would create a cycle",
        });
      }
      visited.add(currentId);
      const [parent] = await this.database
        .select({ parentId: categoryEntries.parentId })
        .from(categoryEntries)
        .where(eq(categoryEntries.id, currentId))
        .limit(1);
      currentId = parent?.parentId;
    }
  }

  async invalidateCategoryCache() {
    await cacheDel("categories:*");
    clearCategoryCache();
  }
}

function categoryName(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException({
      success: false,
      message: "Please provide a category name",
    });
  }
  const name = value.trim();
  if (name.length > 200) {
    throw new BadRequestException({
      success: false,
      message: "Name cannot be more than 200 characters",
    });
  }
  return name;
}

function categoryWriteError(error) {
  if (error?.code === "23505") {
    return new BadRequestException({
      success: false,
      message: "A category with this name already exists",
    });
  }
  return error;
}

function categorySlug(name, id) {
  return slugify(name, { lower: true, strict: true }) || `category-${id}`;
}

function normalizeParentId(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new BadRequestException({
      success: false,
      message: "Invalid parentId",
    });
  }
  return value;
}

function optionalString(value, field) {
  if (typeof value !== "string") {
    throw new BadRequestException({
      success: false,
      message: `${field} must be a string`,
    });
  }
  return value.trim();
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new BadRequestException({
    success: false,
    message: "Boolean fields must be true or false",
  });
}

function parseInteger(value, fallback, field) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new BadRequestException({
      success: false,
      message: `${field} must be an integer`,
    });
  }
  return parsed;
}

function uploadedOrInput(file, value) {
  if (file) return file.path;
  if (value === undefined) return undefined;
  return optionalString(value, "Image URL");
}

function serializeCategory(category) {
  return {
    _id: category.id,
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    active: category.active,
    imageUrl: category.imageUrl,
    bannerUrl: category.bannerUrl,
    featured: category.featured,
    sortOrder: category.sortOrder,
    color: category.color,
    createdBy: category.createdBy,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function deleteCloudinaryImage(imageUrl, label) {
  const publicId = cloudinaryPublicId(imageUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.warn(`Could not delete ${label}:`, error.message);
  }
}

function cloudinaryPublicId(imageUrl) {
  if (!imageUrl) return null;
  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (
    url.hostname !== "cloudinary.com" &&
    !url.hostname.endsWith(".cloudinary.com")
  ) {
    return null;
  }

  const uploadPath = url.pathname.split("/image/upload/")[1];
  if (!uploadPath) return null;
  const segments = uploadPath.split("/");
  const folderIndex = segments.findIndex(
    (segment, index) =>
      segment === "apple-it-zone" && segments[index + 1] === "categories",
  );
  if (folderIndex < 0) return null;
  return segments
    .slice(folderIndex)
    .join("/")
    .replace(/\.[^.]+$/, "");
}

Injectable()(CategoriesService);
Inject(DATABASE)(CategoriesService, undefined, 0);

export { CategoriesService, cloudinaryPublicId, serializeCategory };
