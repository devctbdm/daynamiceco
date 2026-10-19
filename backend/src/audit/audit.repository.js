import { and, count, desc, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { auditLogs } from "../db/schema.js";

/**
 * Audit rows live in the legacy document-envelope table: the JSONB `document`
 * column holds the complete audit entry exactly as it was written before the
 * migration, so every consumer keeps receiving the same shape
 * (`_id`, `actor`, `changes`, `eventType`, ...).
 */

export function serializeAuditLog(row) {
  if (!row) return null;
  const document = row.document || {};
  return {
    _id: row.id,
    actor: document.actor ?? null,
    action: document.action ?? "",
    eventType: document.eventType ?? "",
    target: document.target ?? "",
    changes: document.changes ?? null,
    ip: document.ip ?? "",
    userAgent: document.userAgent ?? "",
    createdAt: document.createdAt ?? null,
  };
}

export async function createAuditLog(input, database = getDatabase()) {
  if (!input?.action) throw new Error("Audit log action is required");

  const now = new Date();
  const document = {
    actor: input.actor ?? null,
    action: input.action,
    eventType: input.eventType ?? "",
    target: String(input.target ?? ""),
    changes: input.changes ?? null,
    ip: input.ip ?? "",
    userAgent: input.userAgent ?? "",
    createdAt: now.toISOString(),
  };

  const [row] = await database
    .insert(auditLogs)
    .values({ id: randomUUID(), document, createdAt: now, updatedAt: now })
    .returning();
  if (!row) throw new Error("Failed to create audit log");
  return serializeAuditLog(row);
}

/**
 * Paginated audit list for the admin audit page.
 *
 * `status` mirrors the pre-migration semantics: `success` means the recorded
 * status code is below 400, `failed` means 400 and above. Entries without a
 * recorded status code (for example LOGIN events) are excluded from both,
 * exactly like the old `changes.statusCode` Mongo query did.
 */
export async function listAuditLogs(
  { page = 1, limit = 20, role, status, search } = {},
  database = getDatabase(),
) {
  const conditions = [];

  if (role) {
    conditions.push(
      sql`${auditLogs.document} -> 'actor' ->> 'role' = ${String(role)}`,
    );
  }
  if (status === "success") {
    conditions.push(
      sql`(${auditLogs.document} #>> '{changes,statusCode}')::int < 400`,
    );
  } else if (status === "failed") {
    conditions.push(
      sql`(${auditLogs.document} #>> '{changes,statusCode}')::int >= 400`,
    );
  }
  if (search) {
    const pattern = `%${String(search).replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        sql`${auditLogs.document} ->> 'action' ilike ${pattern}`,
        sql`${auditLogs.document} -> 'actor' ->> 'name' ilike ${pattern}`,
        sql`${auditLogs.document} ->> 'ip' ilike ${pattern}`,
      ),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [countRows, rows] = await Promise.all([
    database.select({ total: count() }).from(auditLogs).where(where),
    database
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  return {
    logs: rows.map(serializeAuditLog),
    total: Number(countRows[0]?.total ?? 0),
  };
}

/** Most recent entries for a set of structured event types (staff overview). */
export async function findAuditLogsByEventTypes(
  eventTypes,
  { limit = 10 } = {},
  database = getDatabase(),
) {
  if (!eventTypes?.length) return [];

  const rows = await database
    .select()
    .from(auditLogs)
    .where(
      inArray(
        sql`${auditLogs.document} ->> 'eventType'`,
        eventTypes.map(String),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map(serializeAuditLog);
}
