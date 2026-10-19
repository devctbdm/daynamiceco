import { count, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { serializeSmsLog, smsLogEntries } from "../models/SmsLog.js";

export async function createSmsLog(input, database = getDatabase()) {
  const now = new Date();
  const [row] = await database
    .insert(smsLogEntries)
    .values({
      id: randomUUID(),
      recipients: input.to,
      message: input.message,
      segments: input.segments ?? 1,
      status: input.status ?? "sent",
      providerStatus: input.providerStatus ?? "",
      providerMessage: input.providerMessage ?? "",
      errorCode: input.errorCode ?? "",
      raw: input.raw ?? {},
      sentBy: input.sentBy ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error("Failed to create SMS log");
  return serializeSmsLog(row);
}

export async function listSmsLogs({ page, limit }, database = getDatabase()) {
  const [countRows, rows] = await Promise.all([
    database.select({ total: count() }).from(smsLogEntries),
    database
      .select()
      .from(smsLogEntries)
      .orderBy(desc(smsLogEntries.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);
  return {
    logs: rows.map(serializeSmsLog),
    total: Number(countRows[0]?.total ?? 0),
  };
}
