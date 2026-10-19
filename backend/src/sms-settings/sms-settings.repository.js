import { eq } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import {
  serializeSmsSetting,
  smsSettingEntries,
} from "../models/SmsSetting.js";

export async function getSmsSetting(database = getDatabase()) {
  await database
    .insert(smsSettingEntries)
    .values({ id: "default" })
    .onConflictDoNothing({ target: smsSettingEntries.id });
  const [row] = await database
    .select()
    .from(smsSettingEntries)
    .where(eq(smsSettingEntries.id, "default"))
    .limit(1);
  if (!row) throw new Error("Failed to load SMS settings");
  return serializeSmsSetting(row);
}
