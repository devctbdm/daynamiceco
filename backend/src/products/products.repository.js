import { BadRequestException } from "@nestjs/common";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import { productEntries } from "../models/Product.js";
import { findUsersByIds } from "../users/users.repository.js";

export async function findProductById(id, database = getDatabase()) {
  if (!isProductId(id)) return null;
  const [row] = await database
    .select()
    .from(productEntries)
    .where(eq(productEntries.id, String(id)))
    .limit(1);
  return row ? serializeProduct(row) : null;
}

export async function findProductBySlug(slug, database = getDatabase()) {
  const [row] = await database
    .select()
    .from(productEntries)
    .where(eq(productEntries.slug, String(slug)))
    .limit(1);
  return row ? serializeProduct(row) : null;
}

export async function findProductsByIds(ids, database = getDatabase()) {
  const productIds = [...new Set((ids ?? []).filter(isProductId).map(String))];
  if (!productIds.length) return [];
  const rows = await database
    .select()
    .from(productEntries)
    .where(inArray(productEntries.id, productIds));
  return rows.map(serializeProduct);
}

export async function findProductSummariesByIds(ids, database = getDatabase()) {
  const productIds = [...new Set((ids ?? []).filter(isProductId).map(String))];
  if (!productIds.length) return [];
  const rows = await database
    .select({
      id: productEntries.id,
      sku: productEntries.sku,
      productCode: productEntries.productCode,
      category: productEntries.category,
    })
    .from(productEntries)
    .where(inArray(productEntries.id, productIds));
  return rows.map((row) => ({ ...row, _id: row.id }));
}

export function resolveProductPurchase(product, variantId = "") {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  let variant = null;

  if (variants.length > 0) {
    if (!variantId) {
      throw new BadRequestException({
        success: false,
        message: `Please select a combination for ${product.name}`,
      });
    }
    variant = variants.find(
      (entry) => entry?._id === variantId && entry.enabled !== false,
    );
    if (!variant) {
      throw new BadRequestException({
        success: false,
        message: `The selected combination for ${product.name} is unavailable`,
      });
    }
  } else if (variantId) {
    throw new BadRequestException({
      success: false,
      message: `The selected combination for ${product.name} is unavailable`,
    });
  }

  const basePrice = variant ? Number(variant.price) : Number(product.price);
  const discountPrice = Number(
    variant ? variant.discountPrice || 0 : product.discountPrice || 0,
  );
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new BadRequestException({
      success: false,
      message: "The selected product combination has no valid price",
    });
  }
  if (variant && !String(variant.sku || "").trim()) {
    throw new BadRequestException({
      success: false,
      message: `The selected combination for ${product.name} has no SKU`,
    });
  }

  const stock = Number(variant ? variant.stock ?? 0 : product.stock ?? 0);
  if (
    !Number.isFinite(stock) ||
    stock < 0 ||
    (variant && !Number.isSafeInteger(stock))
  ) {
    throw new BadRequestException({
      success: false,
      message: "The selected product combination has invalid stock",
    });
  }
  const price =
    discountPrice > 0 && discountPrice < basePrice
      ? discountPrice
      : basePrice;
  const variantLabel = variant
    ? [variant.color, variant.storage, variant.ram].filter(Boolean).join(" / ")
    : "";

  return {
    variant,
    variantId: variant ? String(variant._id) : "",
    variantLabel,
    sku: variant?.sku || product.sku || "",
    price,
    promoDiscount: basePrice - price,
    stock,
    image:
      (variant?.images?.length ? variant.images[0] : null) ||
      product.images?.[0] ||
      "",
  };
}

export function assertProductPurchaseStock(purchase, quantity, productName) {
  if (purchase.stock < quantity) {
    throw new BadRequestException({
      success: false,
      message: `Insufficient stock for ${productName}${purchase.variantLabel ? ` (${purchase.variantLabel})` : ""}`,
    });
  }
}

export async function countActiveProducts(database = getDatabase()) {
  const [result] = await database
    .select({ count: sql`count(*)::integer` })
    .from(productEntries)
    .where(eq(productEntries.status, "active"));
  return Number(result?.count ?? 0);
}

/**
 * Active products at or below a stock threshold, most critical first.
 * Powers the dashboard "low stock" panel (out-of-stock items sort highest).
 */
export async function findLowStockProducts(
  { limit = 6, threshold = 5 } = {},
  database = getDatabase(),
) {
  const rows = await database
    .select({
      id: productEntries.id,
      name: productEntries.name,
      slug: productEntries.slug,
      images: productEntries.images,
      stock: productEntries.stock,
      sku: productEntries.sku,
    })
    .from(productEntries)
    .where(
      and(
        eq(productEntries.status, "active"),
        lte(productEntries.stock, threshold),
      ),
    )
    .orderBy(asc(productEntries.stock), asc(productEntries.name))
    .limit(limit);

  return rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    stock: Number(row.stock ?? 0),
    sku: row.sku ?? "",
    image: Array.isArray(row.images) ? (row.images[0] ?? "") : "",
  }));
}

export async function productSkuExists(sku, database = getDatabase()) {
  const [row] = await database
    .select({ id: productEntries.id })
    .from(productEntries)
    .where(eq(productEntries.sku, sku))
    .limit(1);
  return Boolean(row);
}

export async function productCodeExists(productCode, database = getDatabase()) {
  const [row] = await database
    .select({ id: productEntries.id })
    .from(productEntries)
    .where(eq(productEntries.productCode, productCode))
    .limit(1);
  return Boolean(row);
}

export async function changeProductStock(
  id,
  amount,
  { requireAvailable = false } = {},
  database = getDatabase(),
) {
  if (!isProductId(id) || !Number.isFinite(amount) || amount === 0)
    return false;
  const conditions = [eq(productEntries.id, String(id))];
  if (requireAvailable)
    conditions.push(gte(productEntries.stock, Math.abs(amount)));
  if (amount < 0) {
    conditions.push(sql`${productEntries.stock} + ${amount} >= 0`);
  }
  const [updated] = await database
    .update(productEntries)
    .set({
      stock: sql`${productEntries.stock} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning({ id: productEntries.id });
  return Boolean(updated);
}

export async function changeProductVariantStock(
  id,
  variantId,
  amount,
  { requireAvailable = false } = {},
  database = getDatabase(),
) {
  if (
    !isProductId(id) ||
    typeof variantId !== "string" ||
    !variantId ||
    !Number.isSafeInteger(amount) ||
    amount === 0
  ) {
    return false;
  }

  return database.transaction(async (transaction) => {
    const [product] = await transaction
      .select({
        id: productEntries.id,
        variants: productEntries.variants,
      })
      .from(productEntries)
      .where(eq(productEntries.id, String(id)))
      .for("update")
      .limit(1);
    if (!product || !Array.isArray(product.variants)) return false;

    const index = product.variants.findIndex(
      (variant) => variant?._id === variantId,
    );
    if (index < 0) return false;

    const variants = [...product.variants];
    const current = variants[index];
    const stock = Number(current.stock ?? 0);
    if (
      !Number.isSafeInteger(stock) ||
      stock + amount < 0 ||
      (requireAvailable && current.enabled === false)
    ) {
      return false;
    }
    variants[index] = { ...current, stock: stock + amount };

    await transaction
      .update(productEntries)
      .set({ variants, updatedAt: new Date() })
      .where(eq(productEntries.id, String(id)));
    return true;
  });
}

export async function populateProductRatings(product) {
  return (await populateProductsRatings([product]))[0];
}

export async function populateProductsRatings(products) {
  const userIds = [
    ...new Set(
      products
        .flatMap((product) => product?.ratings ?? [])
        .map((rating) => rating.user)
        .filter(isProductId),
    ),
  ];
  const users = await findUsersByIds(userIds, { fields: ["name"] });
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  return products.map((product) => ({
    ...product,
    ratings: (product.ratings ?? []).map((rating) => ({
      ...rating,
      user: usersById.get(String(rating.user)) ?? rating.user,
    })),
  }));
}

export async function allProductRows(database = getDatabase()) {
  return database.select().from(productEntries);
}

export function serializeProduct(row) {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    id: row.id,
    categories: Array.isArray(row.categories) ? row.categories : [],
    images: Array.isArray(row.images) ? row.images : [],
    imageAlts: Array.isArray(row.imageAlts) ? row.imageAlts : [],
    pcPart: row.pcPart ?? defaultPcPart(),
    specifications: row.specifications ?? {},
    content: row.content ?? "",
    seo: row.seo ?? {},
    ratings: Array.isArray(row.ratings) ? row.ratings : [],
    variants: Array.isArray(row.variants) ? row.variants : [],
  };
}

export function isProductId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

export function defaultPcPart() {
  return {
    enabled: false,
    type: "",
    socket: "",
    platform: "",
    formFactor: "",
    wattage: 0,
    specs: {},
  };
}
