import { and, eq, gte, inArray, sql } from "drizzle-orm";
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

export async function countActiveProducts(database = getDatabase()) {
  const [result] = await database
    .select({ count: sql`count(*)::integer` })
    .from(productEntries)
    .where(eq(productEntries.status, "active"));
  return Number(result?.count ?? 0);
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
