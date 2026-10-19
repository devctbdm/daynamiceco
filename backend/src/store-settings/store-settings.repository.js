import { eq } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import {
  serializeStoreSettings,
  storeSettings,
} from "../models/StoreSetting.js";

export async function getStoreSettings(database = getDatabase()) {
  const [settings] = await database
    .insert(storeSettings)
    .values({ id: "default" })
    .onConflictDoNothing({ target: storeSettings.id })
    .returning();

  if (settings) return serializeStoreSettings(settings);

  const [existing] = await database
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, "default"))
    .limit(1);

  if (!existing) throw new Error("Failed to load store settings");
  return serializeStoreSettings(existing);
}
