import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { randomBytes } from "node:crypto";
import slugify from "slugify";
import { cacheDel, cacheGet, cacheSet } from "../config/redis.js";
import { DATABASE } from "../db/database.js";
import { cloudinary } from "../middleware/upload.js";
import { productEntries } from "../models/Product.js";
import {
  defaultPcPart,
  isProductId,
  populateProductRatings,
  populateProductsRatings,
  serializeProduct,
} from "./products.repository.js";

const PC_PART_TYPES = new Set([
  "",
  "cpu",
  "cpu_cooler",
  "motherboard",
  "ram",
  "storage",
  "gpu",
  "psu",
  "casing",
  "monitor",
  "casing_cooler",
  "keyboard",
  "mouse",
  "speaker",
  "headphone",
  "wifi_adapter",
  "antivirus",
  "ups",
]);
const PRODUCT_STATUSES = new Set(["active", "draft", "out_of_stock"]);

class ProductsService {
  constructor(database) {
    this.database = database;
  }

  async findAll(query) {
    const cacheKey = `products:neon:list:${JSON.stringify(query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);

    const { conditions, sort } = this.buildListQuery(query);
    const page = positiveInteger(query.page, 1);
    const limit = positiveInteger(query.limit, 12);
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRow] = await this.database
      .select({ total: count() })
      .from(productEntries)
      .where(where);
    const rows = await this.database
      .select()
      .from(productEntries)
      .where(where)
      .orderBy(sort)
      .limit(limit)
      .offset((page - 1) * limit);
    const products = await populateProductsRatings(rows.map(serializeProduct));
    const response = {
      success: true,
      count: products.length,
      total: Number(totalRow?.total ?? 0),
      page,
      pages: Math.ceil(Number(totalRow?.total ?? 0) / limit),
      products,
    };
    await cacheSet(
      cacheKey,
      JSON.stringify(response),
      Number(process.env.REDIS_TTL) || 300,
    );
    return response;
  }

  async findPcParts(query) {
    const conditions = [
      eq(productEntries.status, "active"),
      sql`${productEntries.pcPart}->>'enabled' = 'true'`,
    ];
    for (const key of ["type", "socket", "platform", "formFactor"]) {
      if (query[key]) {
        conditions.push(sql`${productEntries.pcPart}->>${key} = ${query[key]}`);
      }
    }
    if (query.search) {
      conditions.push(ilike(productEntries.name, `%${query.search}%`));
    }
    const minPrice = numericQuery(query.minPrice);
    const maxPrice = numericQuery(query.maxPrice);
    if (minPrice !== null || maxPrice !== null) {
      const priceConditions = [
        minPrice !== null ? gte(productEntries.price, minPrice) : undefined,
        maxPrice !== null ? lte(productEntries.price, maxPrice) : undefined,
      ].filter(Boolean);
      const discountConditions = [
        minPrice !== null
          ? gte(productEntries.discountPrice, minPrice)
          : undefined,
        maxPrice !== null
          ? lte(productEntries.discountPrice, maxPrice)
          : undefined,
        sql`${productEntries.discountPrice} > 0`,
      ].filter(Boolean);
      conditions.push(or(and(...discountConditions), and(...priceConditions)));
    }

    const numericSpecs = {
      cores: ["minCores", "maxCores"],
      vram: ["minVram", "maxVram"],
      capacity: ["minCapacity", "maxCapacity"],
      refreshRate: ["minRefreshRate", "maxRefreshRate"],
    };
    for (const [field, [minKey, maxKey]] of Object.entries(numericSpecs)) {
      const minimum = numericQuery(query[minKey]);
      const maximum = numericQuery(query[maxKey]);
      if (minimum !== null || maximum !== null) {
        const value = sql`case when ${productEntries.pcPart}->'specs'->>${field} ~ '^-?[0-9]+(\\.[0-9]+)?$' then (${productEntries.pcPart}->'specs'->>${field})::numeric end`;
        if (minimum !== null) conditions.push(sql`${value} >= ${minimum}`);
        if (maximum !== null) conditions.push(sql`${value} <= ${maximum}`);
      }
    }
    for (const [field, queryKey] of [
      ["series", "series"],
      ["generation", "generation"],
      ["brand", "brand"],
      ["storageType", "storageType"],
      ["ramType", "ramType"],
      ["coolerType", "coolerType"],
      ["efficiency", "efficiency"],
      ["panelType", "panelType"],
    ]) {
      if (query[queryKey]) {
        conditions.push(
          sql`${productEntries.pcPart}->'specs'->>${field} = ${query[queryKey]}`,
        );
      }
    }

    const where = and(...conditions);
    const page = positiveInteger(query.page, 1);
    const limit = positiveInteger(query.limit, 200);
    const order =
      query.sort === "price-asc"
        ? asc(productEntries.price)
        : query.sort === "price-desc"
          ? desc(productEntries.price)
          : asc(productEntries.name);
    const [totalRow] = await this.database
      .select({ total: count() })
      .from(productEntries)
      .where(where);
    const rows = await this.database
      .select({
        id: productEntries.id,
        name: productEntries.name,
        price: productEntries.price,
        discountPrice: productEntries.discountPrice,
        images: productEntries.images,
        stock: productEntries.stock,
        brand: productEntries.brand,
        pcPart: productEntries.pcPart,
        slug: productEntries.slug,
      })
      .from(productEntries)
      .where(where)
      .orderBy(order)
      .limit(limit)
      .offset((page - 1) * limit);
    const products = rows.map((row) => ({
      ...row,
      _id: row.id,
      id: row.id,
      images: Array.isArray(row.images) ? row.images : [],
      pcPart: row.pcPart ?? defaultPcPart(),
    }));
    const total = Number(totalRow?.total ?? 0);
    return {
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      products,
    };
  }

  async findById(id) {
    const cacheKey = `product:neon:id:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);
    const [row] = isProductId(id)
      ? await this.database
          .select()
          .from(productEntries)
          .where(eq(productEntries.id, id))
          .limit(1)
      : [];
    if (!row) throw productNotFound();
    const response = {
      success: true,
      product: await populateProductRatings(serializeProduct(row)),
    };
    await cacheSet(
      cacheKey,
      JSON.stringify(response),
      Number(process.env.REDIS_TTL) || 300,
    );
    return response;
  }

  async findBySlug(slug) {
    const cacheKey = `product:neon:slug:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);
    const [row] = await this.database
      .select()
      .from(productEntries)
      .where(eq(productEntries.slug, slug))
      .limit(1);
    if (!row) throw productNotFound();
    const response = {
      success: true,
      product: await populateProductRatings(serializeProduct(row)),
    };
    await cacheSet(
      cacheKey,
      JSON.stringify(response),
      Number(process.env.REDIS_TTL) || 300,
    );
    return response;
  }

  async findByCategory(category) {
    const rows = await this.database
      .select()
      .from(productEntries)
      .where(
        or(
          eq(productEntries.category, category),
          sql`${productEntries.categories} @> ${JSON.stringify([category])}::jsonb`,
        ),
      );
    return rows.map(serializeProduct);
  }

  async create(input, files, userId) {
    const name = requiredText(input.name, "Please provide a product name", 200);
    const description = requiredText(
      input.description,
      "Please provide a product description",
    );
    if (
      input.price === undefined ||
      input.price === null ||
      input.price === ""
    ) {
      throw badRequest("Please provide a product price");
    }
    const price = nonnegativeNumber(input.price, "Price cannot be negative");
    const allFiles = Array.isArray(files)
      ? files
      : files && typeof files === "object"
        ? Object.values(files).flat()
        : [];
    const mainImages = allFiles
      .filter((file) => file.fieldname === "images")
      .map((file) => file.path)
      .filter(Boolean);
    const images = mainImages;
    if (!images.length) throw badRequest("Please provide at least one image");
    const parsedCategories = parseArray(input.categories);
    const category = requiredText(
      parsedCategories[0] ?? input.category,
      "Please provide a category",
    );
    const now = new Date();
    const variantsInput = parseJsonValue(input.variants, []);
    const processedVariants = Array.isArray(variantsInput)
      ? variantsInput
          .map((variant, idx) => {
            const variantFiles = allFiles
              .filter((file) => file.fieldname === `variantImages_${idx}`)
              .map((file) => file.path)
              .filter(Boolean);
            const variantImages =
              variantFiles.length > 0
                ? variantFiles
                : Array.isArray(variant.images)
                  ? variant.images.filter(Boolean)
                  : [];
            return {
              ...variant,
              images: variantImages,
              _variantImagesUploaded: variantFiles.length > 0,
            };
          })
      : variantsInput;
    const product = {
      id: randomBytes(12).toString("hex"),
      name,
      slug: normalizeSlug(input.slug || name),
      description,
      price,
      discountPrice: optionalNonnegativeNumber(
        input.discountPrice,
        0,
        "Discount price cannot be negative",
      ),
      costPrice: optionalNonnegativeNumber(
        input.costPrice,
        0,
        "Cost price cannot be negative",
      ),
      sku: optionalText(input.sku),
      productCode: optionalText(input.productCode),
      brand: optionalText(input.brand),
      category,
      categories: parsedCategories,
      images,
      imageAlts: parseArray(input.imageAlts),
      stock: optionalNonnegativeNumber(
        input.stock,
        0,
        "Stock cannot be negative",
      ),
      status: normalizeStatus(input.status),
      featured: parseBoolean(input.featured),
      holiday: parseBoolean(input.holiday),
      pcPart: parsePcPart(input.pcPart),
      specifications: parseJsonValue(input.specifications, {}),
      content: parseRichContent(input.content),
      seo: normalizeSeo(input, name, description),
      ratings: [],
      averageRating: 0,
      variants: parseVariants(shareVariantImagesByColor(processedVariants)),
      createdBy: String(userId),
      createdAt: now,
      updatedAt: now,
    };
    try {
      const [row] = await this.database
        .insert(productEntries)
        .values(product)
        .returning();
      if (!row) throw new Error("Failed to create product");
      await invalidateProductCache();
      return serializeProduct(row);
    } catch (error) {
      throw translateProductConflict(error);
    }
  }

  async update(id, input, files) {
    if (!isProductId(id)) throw productNotFound();
    const [existingRow] = await this.database
      .select()
      .from(productEntries)
      .where(eq(productEntries.id, id))
      .limit(1);
    if (!existingRow) throw productNotFound();
    const existing = serializeProduct(existingRow);
    const updates = {};
    const allFiles = Array.isArray(files)
      ? files
      : files && typeof files === "object"
        ? Object.values(files).flat()
        : [];

    if (input.name !== undefined) {
      updates.name = requiredText(
        input.name,
        "Please provide a product name",
        200,
      );
      if (!input.slug) updates.slug = normalizeSlug(updates.name);
    }
    if (input.slug && String(input.slug).trim()) {
      updates.slug = normalizeSlug(input.slug);
    }
    if (input.description !== undefined) {
      updates.description = requiredText(
        input.description,
        "Please provide a product description",
      );
    }
    if (input.brand !== undefined) updates.brand = optionalText(input.brand);
    if (input.price !== undefined) {
      updates.price = nonnegativeNumber(
        input.price,
        "Price cannot be negative",
      );
    }
    if (input.discountPrice !== undefined) {
      updates.discountPrice = nonnegativeNumber(
        input.discountPrice,
        "Discount price cannot be negative",
      );
    }
    if (input.costPrice !== undefined) {
      updates.costPrice = nonnegativeNumber(
        input.costPrice,
        "Cost price cannot be negative",
      );
    }
    if (input.category !== undefined) {
      updates.category = requiredText(
        input.category,
        "Please provide a category",
      );
    }
    if (input.categories !== undefined) {
      updates.categories = parseArray(input.categories);
      if (updates.categories.length && input.category === undefined) {
        updates.category = updates.categories[0];
      }
    }
    if (input.stock !== undefined) {
      updates.stock = nonnegativeNumber(
        input.stock,
        "Stock cannot be negative",
      );
    }
    if (input.sku !== undefined) updates.sku = optionalText(input.sku);
    if (input.productCode !== undefined) {
      updates.productCode = optionalText(input.productCode);
    }
    if (input.status !== undefined)
      updates.status = normalizeStatus(input.status);
    if (input.featured !== undefined)
      updates.featured = parseBoolean(input.featured);
    if (input.holiday !== undefined)
      updates.holiday = parseBoolean(input.holiday);
    if (input.pcPart !== undefined) updates.pcPart = parsePcPart(input.pcPart);
    if (input.variants !== undefined) {
      const variantsInput = parseJsonValue(input.variants, input.variants);
      const processedVariants = Array.isArray(variantsInput)
        ? shareVariantImagesByColor(variantsInput.map((variant, idx) => {
            const variantFiles = allFiles
              .filter((file) => file.fieldname === `variantImages_${idx}`)
              .map((file) => file.path)
              .filter(Boolean);
            const variantImages =
              variantFiles.length > 0
                ? variantFiles
                : Array.isArray(variant.images)
                  ? variant.images.filter(Boolean)
                  : [];
            return {
              ...variant,
              images: variantImages,
              _variantImagesUploaded: variantFiles.length > 0,
            };
          }))
        : variantsInput;
      updates.variants = parseVariants(processedVariants);
    }
    if (input.specifications !== undefined) {
      updates.specifications = parseJsonValue(
        input.specifications,
        input.specifications,
      );
    }
    if (input.content !== undefined)
      updates.content = parseRichContent(input.content);
    if (input.imageAlts !== undefined)
      updates.imageAlts = parseArray(input.imageAlts);
    if (
      input.metaTitle !== undefined ||
      input.metaDescription !== undefined ||
      input.focusKeyword !== undefined ||
      input.canonical !== undefined
    ) {
      updates.seo = { ...existing.seo };
      if (input.metaTitle !== undefined) {
        updates.seo.metaTitle = input.metaTitle
          ? String(input.metaTitle).trim()
          : `${updates.name ?? existing.name} - Apple IT Zone`;
      }
      if (input.metaDescription !== undefined) {
        updates.seo.metaDescription = input.metaDescription
          ? String(input.metaDescription).trim()
          : String(updates.description ?? existing.description).substring(
              0,
              320,
            );
      }
      if (input.focusKeyword !== undefined) {
        updates.seo.focusKeyword = input.focusKeyword
          ? String(input.focusKeyword).trim()
          : "";
      }
      if (input.canonical !== undefined) {
        updates.seo.canonical = input.canonical
          ? String(input.canonical).trim()
          : "";
      }
    }

    const uploadedImages = allFiles
      .filter((file) => file.fieldname === "images")
      .map((file) => file.path)
      .filter(Boolean);
    if (uploadedImages.length) {
      updates.images = uploadedImages;
    }
    updates.updatedAt = new Date();

    try {
      const [updatedRow] = await this.database
        .update(productEntries)
        .set(updates)
        .where(eq(productEntries.id, id))
        .returning();
      if (!updatedRow) throw productNotFound();
      if (uploadedImages.length) {
        await deleteProductImages(existing.images);
      }
      await invalidateProductCache();
      return serializeProduct(updatedRow);
    } catch (error) {
      if (error?.status) throw error;
      throw translateProductConflict(error);
    }
  }

  async addRating(id, userId, ratingInput, comment) {
    const ratingValue = Number(ratingInput);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      throw badRequest("Rating must be between 1 and 5");
    }
    const updated = await this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(productEntries)
        .where(eq(productEntries.id, id))
        .for("update")
        .limit(1);
      if (!row) throw productNotFound();
      const ratings = Array.isArray(row.ratings) ? [...row.ratings] : [];
      const current = ratings.find(
        (entry) => String(entry.user) === String(userId),
      );
      if (current) {
        current.rating = ratingValue;
        if (comment) current.comment = String(comment);
        current.createdAt = new Date().toISOString();
        current.status = "pending";
        current.featured = false;
      } else {
        ratings.push({
          _id: randomBytes(12).toString("hex"),
          user: String(userId),
          rating: ratingValue,
          comment: comment ? String(comment) : "",
          status: "pending",
          featured: false,
          createdAt: new Date().toISOString(),
        });
      }
      const averageRating = calculateAverageRating(ratings);
      const [saved] = await transaction
        .update(productEntries)
        .set({ ratings, averageRating, updatedAt: new Date() })
        .where(eq(productEntries.id, id))
        .returning();
      return serializeProduct(saved);
    });
    await cacheDel("product:*");
    return updated;
  }

  async delete(id) {
    if (!isProductId(id)) throw productNotFound();
    const [existing] = await this.database
      .select()
      .from(productEntries)
      .where(eq(productEntries.id, id))
      .limit(1);
    if (!existing) throw productNotFound();
    await this.database.delete(productEntries).where(eq(productEntries.id, id));
    await deleteProductImages(existing.images ?? []);
    await invalidateProductCache();
  }

  buildListQuery(query) {
    const conditions = [];
    if (query.holiday === "true" || query.holiday === true) {
      conditions.push(eq(productEntries.holiday, true));
    }
    if (query.category) {
      conditions.push(
        or(
          eq(productEntries.category, query.category),
          sql`${productEntries.categories} @> ${JSON.stringify([query.category])}::jsonb`,
        ),
      );
    }
    const minPrice = numericQuery(query.minPrice);
    const maxPrice = numericQuery(query.maxPrice);
    if (minPrice !== null) conditions.push(gte(productEntries.price, minPrice));
    if (maxPrice !== null) conditions.push(lte(productEntries.price, maxPrice));
    if (query.search) {
      conditions.push(
        or(
          ilike(productEntries.name, `%${query.search}%`),
          ilike(productEntries.description, `%${query.search}%`),
        ),
      );
    }
    const order =
      query.sort === "price-asc"
        ? asc(productEntries.price)
        : query.sort === "price-desc"
          ? desc(productEntries.price)
          : query.sort === "rating"
            ? desc(productEntries.averageRating)
            : desc(productEntries.createdAt);
    return { conditions, sort: order };
  }
}

function normalizeSlug(value) {
  const slug = slugify(String(value ?? ""), { lower: true, strict: true });
  if (!slug) throw badRequest("Please provide a valid product name");
  return slug;
}

function requiredText(value, message, maxLength) {
  if (typeof value !== "string" || !value.trim()) throw badRequest(message);
  const trimmed = value.trim();
  if (maxLength && trimmed.length > maxLength) {
    throw badRequest(`Name cannot be more than ${maxLength} characters`);
  }
  return trimmed;
}

function optionalText(value) {
  if (value === null || value === "") return null;
  return typeof value === "string" ? value.trim() : String(value);
}

function nonnegativeNumber(value, message) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw badRequest(message);
  return number;
}

function optionalNonnegativeNumber(value, fallback, message) {
  return value === undefined || value === null || value === ""
    ? fallback
    : nonnegativeNumber(value, message);
}

function numericQuery(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseArray(value) {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [parsed].filter(
        (entry) => typeof entry === "string" && entry.trim(),
      );
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (entry) => typeof entry === "string" && entry.trim().length > 0,
  );
}

function parseBoolean(value) {
  return value === true || value === "true";
}

function normalizeStatus(value) {
  const status = value || "active";
  if (!PRODUCT_STATUSES.has(status)) throw badRequest("Invalid product status");
  return status;
}

function parsePcPart(value) {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      data = undefined;
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return defaultPcPart();
  }
  const enabled = data.enabled === true || data.enabled === "true";
  if (!enabled) return defaultPcPart();
  const type = data.type || "";
  if (!PC_PART_TYPES.has(type)) throw badRequest("Invalid PC part type");
  return {
    enabled: true,
    type,
    socket: stringValue(data.socket),
    platform: stringValue(data.platform),
    formFactor: stringValue(data.formFactor),
    wattage: nonnegativeNumber(data.wattage ?? 0, "Wattage cannot be negative"),
    specs:
      data.specs && typeof data.specs === "object" && !Array.isArray(data.specs)
        ? data.specs
        : {},
  };
}

function shareVariantImagesByColor(value) {
  if (!Array.isArray(value)) return value;
  const imagesByColor = new Map();

  for (const variant of value) {
    const color = stringValue(variant?.color).trim().toLowerCase();
    if (color && variant?._variantImagesUploaded && variant.images?.length) {
      imagesByColor.set(color, variant.images);
    }
  }

  for (const variant of value) {
    const color = stringValue(variant?.color).trim().toLowerCase();
    if (color && !imagesByColor.has(color) && variant?.images?.length) {
      imagesByColor.set(color, variant.images);
    }
  }

  return value.map((variant) => {
    const color = stringValue(variant?.color).trim().toLowerCase();
    const { _variantImagesUploaded, ...cleanVariant } = variant;
    return color && imagesByColor.has(color)
      ? { ...cleanVariant, images: imagesByColor.get(color) }
      : cleanVariant;
  });
}

function parseVariants(value) {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      data = [];
    }
  }
  if (!Array.isArray(data)) return [];
  const variants = data
    .filter((v) => v && typeof v === "object")
    .map((v) => {
      const color = stringValue(v.color) || stringValue(v.name) || "";
      const price =
        v.price !== undefined && v.price !== null && v.price !== ""
          ? nonnegativeNumber(v.price, "Variant price cannot be negative")
          : undefined;
      const stock =
        v.stock !== undefined && v.stock !== null && v.stock !== ""
          ? nonnegativeNumber(v.stock, "Variant stock cannot be negative")
          : undefined;
      const sku = optionalText(v.sku) || "";
      const enabled = v.enabled === undefined ? true : parseBoolean(v.enabled);
      const variant = {
        _id: v._id ? String(v._id) : randomBytes(6).toString("hex"),
        color,
        colorCode: stringValue(v.colorCode) || stringValue(v.hex) || "",
        storage: stringValue(v.storage) || stringValue(v.variantStorage) || "",
        ram: stringValue(v.ram) || stringValue(v.variantRam) || "",
        images: Array.isArray(v.images) ? v.images.filter(Boolean).map(String) : [],
        price,
        discountPrice:
          v.discountPrice !== undefined &&
          v.discountPrice !== null &&
          v.discountPrice !== ""
            ? nonnegativeNumber(
                v.discountPrice,
                "Variant discount price cannot be negative",
              )
            : 0,
        stock: stock ?? 0,
        sku,
        enabled,
        attributes:
          v.attributes &&
          typeof v.attributes === "object" &&
          !Array.isArray(v.attributes)
            ? v.attributes
            : {},
      };

      if (
        enabled &&
        (variant.color || variant.storage || variant.ram) &&
        (price === undefined ||
          price <= 0 ||
          stock === undefined ||
          !sku.trim())
      ) {
        throw badRequest(
          "Each enabled product combination needs a price, stock quantity, and SKU",
        );
      }
      if (
        variant.discountPrice > 0 &&
        price !== undefined &&
        variant.discountPrice >= price
      ) {
        throw badRequest(
          "A combination discount price must be less than its regular price",
        );
      }
      return variant;
    })
    .filter((v) => v.color || v.storage || v.ram);

  const combinations = new Set();
  const skus = new Set();
  const tierPrices = new Map();
  for (const variant of variants.filter((entry) => entry.enabled)) {
    const combination = [
      variant.color,
      variant.storage,
      variant.ram,
    ].map((value) => value.trim().toLowerCase()).join("|");
    const sku = variant.sku.trim().toLowerCase();
    if (combinations.has(combination)) {
      throw badRequest("Product combinations must be unique");
    }
    if (sku && skus.has(sku)) {
      throw badRequest("Variant SKUs must be unique");
    }
    const tier = [variant.storage, variant.ram]
      .map((value) => value.trim().toLowerCase())
      .join("|");
    const tierPrice = {
      price: variant.price,
      discountPrice: variant.discountPrice,
    };
    const existingTierPrice = tierPrices.get(tier);
    if (
      existingTierPrice &&
      (existingTierPrice.price !== tierPrice.price ||
        existingTierPrice.discountPrice !== tierPrice.discountPrice)
    ) {
      throw badRequest(
        "All colors must use the same price for each storage/RAM option",
      );
    }
    combinations.add(combination);
    if (sku) skus.add(sku);
    tierPrices.set(tier, tierPrice);
  }
  return variants;
}

function parseJsonValue(value, fallback) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseRichContent(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function normalizeSeo(input, name, description) {
  return {
    metaTitle: input.metaTitle
      ? String(input.metaTitle).trim()
      : `${name} - Apple IT Zone`,
    metaDescription: input.metaDescription
      ? String(input.metaDescription).trim()
      : String(description ?? "").substring(0, 320),
    focusKeyword: input.focusKeyword ? String(input.focusKeyword).trim() : "",
    canonical: input.canonical ? String(input.canonical).trim() : "",
  };
}

function calculateAverageRating(ratings) {
  const approved = ratings.filter((rating) => rating.status === "approved");
  if (!approved.length) return 0;
  const total = approved.reduce(
    (sum, rating) => sum + Number(rating.rating || 0),
    0,
  );
  return Number((total / approved.length).toFixed(1));
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function productNotFound() {
  return new NotFoundException({
    success: false,
    message: "Product not found",
  });
}

function badRequest(message) {
  return new BadRequestException({ success: false, message });
}

function translateProductConflict(error) {
  if (error?.code === "23505") {
    const detail = String(error.constraint ?? error.detail ?? "");
    if (detail.includes("product_code")) {
      return new ConflictException({
        success: false,
        message:
          "This product code is already in use. Please generate a new one.",
      });
    }
    return new ConflictException({
      success: false,
      message: "A product with this slug already exists",
    });
  }
  if (error?.status) return error;
  return error;
}

async function deleteProductImages(images) {
  for (const image of images) {
    const publicId = productCloudinaryPublicId(image);
    if (!publicId) continue;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.warn("Could not delete product image:", error.message);
    }
  }
}

function productCloudinaryPublicId(image) {
  let url;
  try {
    url = new URL(image);
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
      segment === "apple-it-zone" && segments[index + 1] === "products",
  );
  if (folderIndex < 0) return null;
  return segments
    .slice(folderIndex)
    .join("/")
    .replace(/\.[^.]+$/, "");
}

async function invalidateProductCache() {
  await cacheDel("products:*");
  await cacheDel("product:*");
}

Injectable()(ProductsService);
Inject(DATABASE)(ProductsService, undefined, 0);

export {
  ProductsService,
  calculateAverageRating,
  parseArray,
  parsePcPart,
  parseVariants,
  productCloudinaryPublicId,
  shareVariantImagesByColor,
};
