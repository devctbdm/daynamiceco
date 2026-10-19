import { and, count, desc, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { invoices, teamMemberEntries, userEntries } from "../db/schema.js";

/**
 * Invoices live in the legacy document-envelope table: the JSONB `document`
 * column holds the complete invoice exactly as the Mongo collection stored it
 * (`_id`, `customer`, `items[]`, `preparedBy`, ...), so the admin UI keeps
 * receiving the same payload while the data layer runs on Neon.
 *
 * Dates are stored as ISO strings inside the document because JSONB has no
 * date type; the serialized values stay ISO strings, which is what the
 * frontend already expects.
 */

export function serializeInvoice(row) {
  if (!row) return null;
  const document = row.document || {};
  return {
    ...document,
    _id: row.id,
    createdAt: document.createdAt ?? row.createdAt?.toISOString?.() ?? null,
    updatedAt: document.updatedAt ?? row.updatedAt?.toISOString?.() ?? null,
  };
}

export async function createInvoice(document, database = getDatabase()) {
  const now = new Date();
  const id = randomUUID();
  const entry = {
    ...document,
    _id: id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const [row] = await database
    .insert(invoices)
    .values({
      id,
      document: entry,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error("Failed to create invoice");
  return serializeInvoice(row);
}

export async function findInvoiceById(id, database = getDatabase()) {
  const [row] = await database
    .select()
    .from(invoices)
    .where(sql`${invoices.id} = ${String(id)}`)
    .limit(1);
  return serializeInvoice(row);
}

export async function findInvoiceByOrderId(orderId, database = getDatabase()) {
  const [row] = await database
    .select()
    .from(invoices)
    .where(sql`${invoices.document} ->> 'order' = ${String(orderId)}`)
    .limit(1);
  return serializeInvoice(row);
}

export async function listInvoices(
  { page = 1, limit = 20, status, search } = {},
  database = getDatabase(),
) {
  const conditions = [];

  if (status) {
    conditions.push(sql`${invoices.document} ->> 'status' = ${String(status)}`);
  }
  if (search) {
    const pattern = `%${String(search).replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      sql`(${invoices.document} ->> 'invoiceNumber' ilike ${pattern}
        or ${invoices.document} -> 'customer' ->> 'name' ilike ${pattern}
        or ${invoices.document} -> 'customer' ->> 'email' ilike ${pattern})`,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [countRows, rows] = await Promise.all([
    database.select({ total: count() }).from(invoices).where(where),
    database
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  return {
    invoices: rows.map(serializeInvoice),
    total: Number(countRows[0]?.total ?? 0),
  };
}

/** Lightweight projection used by the invoice stats endpoint. */
export async function listInvoiceSummaries(database = getDatabase()) {
  return database
    .select({
      status: sql`${invoices.document} ->> 'status'`,
      netPayable: sql`${invoices.document} ->> 'netPayable'`,
    })
    .from(invoices);
}

export async function updateInvoiceDocument(
  id,
  document,
  database = getDatabase(),
) {
  const now = new Date();
  const [row] = await database
    .update(invoices)
    .set({
      document: { ...document, _id: String(id), updatedAt: now.toISOString() },
      updatedAt: now,
    })
    .where(sql`${invoices.id} = ${String(id)}`)
    .returning();
  return serializeInvoice(row);
}

export async function deleteInvoiceById(id, database = getDatabase()) {
  await database.delete(invoices).where(sql`${invoices.id} = ${String(id)}`);
}

/**
 * Resolves `preparedBy` account ids to `{ _id, name }`, checking both the
 * customer and the team-member tables (admins generating invoices can belong
 * to either). Unknown ids are left untouched by the caller.
 */
export async function findPreparedByAccounts(ids, database = getDatabase()) {
  const unique = [...new Set(ids.map(String).filter(Boolean))];
  if (!unique.length) return new Map();

  const [users, members] = await Promise.all([
    database
      .select({ id: userEntries.id, name: userEntries.name })
      .from(userEntries)
      .where(inArray(userEntries.id, unique)),
    database
      .select({ id: teamMemberEntries.id, name: teamMemberEntries.name })
      .from(teamMemberEntries)
      .where(inArray(teamMemberEntries.id, unique)),
  ]);

  return new Map(
    [...users, ...members].map((row) => [
      row.id,
      { _id: row.id, name: row.name },
    ]),
  );
}
