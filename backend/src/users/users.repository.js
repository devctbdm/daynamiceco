import { and, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import { serializeUser, userEntries } from "../models/User.js";

const SELECTABLE_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "address",
  "addresses",
  "role",
  "status",
  "createdAt",
  "updatedAt",
]);

export async function findUserById(
  id,
  { includeSensitive = false, database = getDatabase() } = {},
) {
  const userId = String(id ?? "").toLowerCase();
  if (!isUserId(userId)) return null;
  const [row] = await database
    .select()
    .from(userEntries)
    .where(eq(userEntries.id, userId))
    .limit(1);
  return serializeUser(row, { includeSensitive });
}

export async function findUserByEmail(
  email,
  { roles, includeSensitive = false, database = getDatabase() } = {},
) {
  if (typeof email !== "string") return null;
  const conditions = [eq(userEntries.email, email.trim().toLowerCase())];
  if (roles?.length) conditions.push(inArray(userEntries.role, roles));
  const [row] = await database
    .select()
    .from(userEntries)
    .where(and(...conditions))
    .limit(1);
  return serializeUser(row, { includeSensitive });
}

export async function findUserForLogin(
  identifier,
  { roles, database = getDatabase() } = {},
) {
  if (typeof identifier !== "string") return null;
  const normalized = identifier.trim();
  const conditions = [
    eq(userEntries.email, normalized.toLowerCase()),
    eq(userEntries.phone, normalized),
  ];
  if (roles?.length) {
    const [row] = await database
      .select()
      .from(userEntries)
      .where(and(or(...conditions), inArray(userEntries.role, roles)))
      .limit(1);
    return serializeUser(row, { includeSensitive: true });
  }
  const [row] = await database
    .select()
    .from(userEntries)
    .where(or(...conditions))
    .limit(1);
  return serializeUser(row, { includeSensitive: true });
}

export async function findUserByPhoneSuffix(
  phone,
  { includeSensitive = false, database = getDatabase() } = {},
) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const suffix = digits.slice(-10);
  if (!suffix) return null;
  const [row] = await database
    .select()
    .from(userEntries)
    .where(
      sql`right(regexp_replace(${userEntries.phone}, '[^0-9]', '', 'g'), ${suffix.length}) = ${suffix}`,
    )
    .limit(1);
  return serializeUser(row, { includeSensitive });
}

export async function findUsersByIds(
  ids,
  { fields, database = getDatabase() } = {},
) {
  const userIds = [
    ...new Set(
      (ids ?? [])
        .map(String)
        .filter(isUserId)
        .map((id) => id.toLowerCase()),
    ),
  ];
  if (!userIds.length) return [];
  const selectedFields = fields
    ? [...fields].filter((field) => SELECTABLE_FIELDS.has(field))
    : null;
  const selection = selectedFields
    ? {
        id: userEntries.id,
        ...Object.fromEntries(
          selectedFields.map((field) => [field, userEntries[field]]),
        ),
      }
    : undefined;
  const query = database.select(selection).from(userEntries);
  const rows = await query.where(inArray(userEntries.id, userIds));
  return rows.map((row) => {
    if (!selection) return serializeUser(row);
    return { ...row, _id: row.id };
  });
}

export async function countUsers({
  role,
  status,
  database = getDatabase(),
} = {}) {
  const conditions = [];
  if (role) conditions.push(eq(userEntries.role, role));
  if (status) conditions.push(eq(userEntries.status, status));
  const [row] = await database
    .select({ total: count() })
    .from(userEntries)
    .where(conditions.length ? and(...conditions) : undefined);
  return Number(row?.total ?? 0);
}

export async function searchUsers(search, database = getDatabase()) {
  const pattern = `%${String(search ?? "")
    .trim()
    .replace(/[\\%_]/g, "\\$&")}%`;
  if (pattern === "%%") return [];
  const rows = await database
    .select({ id: userEntries.id })
    .from(userEntries)
    .where(
      or(
        ilike(userEntries.name, pattern),
        ilike(userEntries.email, pattern),
        ilike(userEntries.phone, pattern),
      ),
    );
  return rows.map((row) => ({ _id: row.id, id: row.id }));
}

export function isUserId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}
