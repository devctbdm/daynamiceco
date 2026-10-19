import { and, count, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import {
  serializeTeamMember,
  teamMemberEntries,
} from "../models/TeamMember.js";

export async function findTeamMemberById(
  id,
  { includeSensitive = false, database = getDatabase() } = {},
) {
  if (!id) return null;
  const [row] = await database
    .select()
    .from(teamMemberEntries)
    .where(eq(teamMemberEntries.id, String(id)))
    .limit(1);
  return row ? serializeTeamMember(row, { includeSensitive }) : null;
}

export async function findTeamMemberByEmail(
  email,
  { includeSensitive = false, database = getDatabase() } = {},
) {
  if (!email) return null;
  const [row] = await database
    .select()
    .from(teamMemberEntries)
    .where(eq(teamMemberEntries.email, String(email).toLowerCase()))
    .limit(1);
  return row ? serializeTeamMember(row, { includeSensitive }) : null;
}

export async function countTeamMembers(filters = {}, database = getDatabase()) {
  const [result] = await database
    .select({ total: count() })
    .from(teamMemberEntries)
    .where(buildFilters(filters));
  return Number(result?.total ?? 0);
}

export async function listTeamMembers({
  filters = {},
  page,
  limit,
  database = getDatabase(),
} = {}) {
  let query = database
    .select()
    .from(teamMemberEntries)
    .where(buildFilters(filters))
    .orderBy(desc(teamMemberEntries.createdAt));
  if (limit !== undefined) {
    query = query.limit(limit);
    if (page !== undefined) query = query.offset((page - 1) * limit);
  }
  const rows = await query;
  return rows.map((row) => serializeTeamMember(row));
}

export async function createTeamMember(input, database = getDatabase()) {
  const now = new Date();
  const [row] = await database
    .insert(teamMemberEntries)
    .values({
      ...input,
      email: input.email.toLowerCase(),
      updatedAt: now,
      createdAt: input.createdAt ?? now,
    })
    .returning();
  return serializeTeamMember(row, { includeSensitive: true });
}

export async function updateTeamMember(id, updates, database = getDatabase()) {
  const [row] = await database
    .update(teamMemberEntries)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(teamMemberEntries.id, String(id)))
    .returning();
  return row ? serializeTeamMember(row, { includeSensitive: true }) : null;
}

export async function deleteTeamMember(id, database = getDatabase()) {
  const [row] = await database
    .delete(teamMemberEntries)
    .where(eq(teamMemberEntries.id, String(id)))
    .returning();
  return row ? serializeTeamMember(row) : null;
}

export async function countTeamMembersByPermissionGroups(
  groupIds,
  database = getDatabase(),
) {
  if (!groupIds.length) return new Map();
  const rows = await database
    .select({
      id: teamMemberEntries.permissionGroup,
      total: count(),
    })
    .from(teamMemberEntries)
    .where(inArray(teamMemberEntries.permissionGroup, groupIds))
    .groupBy(teamMemberEntries.permissionGroup);
  return new Map(rows.map((row) => [row.id, Number(row.total)]));
}

export async function clearTeamMemberPermissionGroup(
  groupId,
  database = getDatabase(),
) {
  const [result] = await database
    .select({ total: count() })
    .from(teamMemberEntries)
    .where(eq(teamMemberEntries.permissionGroup, String(groupId)));
  const affected = Number(result?.total ?? 0);
  if (affected) {
    await database
      .update(teamMemberEntries)
      .set({ permissionGroup: null, updatedAt: new Date() })
      .where(eq(teamMemberEntries.permissionGroup, String(groupId)));
  }
  return affected;
}

export async function teamMemberExists(filters = {}, database = getDatabase()) {
  return (await countTeamMembers(filters, database)) > 0;
}

function buildFilters(filters) {
  const conditions = [];
  if (filters.id !== undefined)
    conditions.push(eq(teamMemberEntries.id, filters.id));
  if (filters.excludeId !== undefined) {
    conditions.push(ne(teamMemberEntries.id, filters.excludeId));
  }
  if (filters.email !== undefined) {
    conditions.push(eq(teamMemberEntries.email, filters.email.toLowerCase()));
  }
  if (filters.role !== undefined)
    conditions.push(eq(teamMemberEntries.role, filters.role));
  if (filters.active !== undefined) {
    conditions.push(eq(teamMemberEntries.active, filters.active));
  }
  if (filters.permissionGroup !== undefined) {
    conditions.push(
      eq(teamMemberEntries.permissionGroup, String(filters.permissionGroup)),
    );
  }
  if (filters.search) {
    const search = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(teamMemberEntries.name, search),
        ilike(teamMemberEntries.email, search),
        ilike(teamMemberEntries.phone, search),
      ),
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}
