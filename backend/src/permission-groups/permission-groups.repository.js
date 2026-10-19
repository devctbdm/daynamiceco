import { eq } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import { permissionGroupEntries } from "../models/PermissionGroup.js";

export async function findPermissionGroupById(id, database = getDatabase()) {
  if (!id) return null;
  const [row] = await database
    .select()
    .from(permissionGroupEntries)
    .where(eq(permissionGroupEntries.id, String(id)))
    .limit(1);
  return row ? serializePermissionGroup(row) : null;
}

export function serializePermissionGroup(group) {
  return { ...group, _id: group.id };
}
