import "dotenv/config";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-sms-logs";

export function normalizeMongoSmsLog(document) {
  const now = new Date();
  return {
    id: String(document._id ?? ""),
    recipients: Array.isArray(document.to)
      ? document.to.map(String)
      : document.to == null
        ? []
        : [String(document.to)],
    message: String(document.message ?? ""),
    segments: Number(document.segments ?? 1),
    status: document.status || "sent",
    providerStatus: String(document.providerStatus ?? ""),
    providerMessage: String(document.providerMessage ?? ""),
    errorCode: String(document.errorCode ?? ""),
    raw: document.raw ?? {},
    sentBy: document.sentBy == null ? null : String(document.sentBy),
    createdAt: toDate(document.createdAt) ?? now,
    updatedAt: toDate(document.updatedAt) ?? now,
  };
}

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Mongo SMS log data contains an invalid date");
  }
  return date;
}

export function validateSmsLogs(logs) {
  const invalid = logs.filter(
    (log) =>
      !/^[a-f\d]{24}$/i.test(log.id) ||
      log.recipients.length === 0 ||
      !log.message ||
      !Number.isInteger(log.segments) ||
      !["sent", "failed"].includes(log.status) ||
      (log.sentBy !== null && !/^[a-f\d]{24}$/i.test(log.sentBy)),
  );
  if (invalid.length) {
    throw new Error(
      `${invalid.length} Mongo SMS log record(s) are invalid; import stopped without writing data`,
    );
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-sms-logs to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes SMS logs to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
    );
  }
  if (!process.env.DB_URI) throw new Error("DB_URI must be configured");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured");
  }

  const mongoose = await loadMongoose();
  const mongo = await mongoose
    .createConnection(process.env.DB_URI, { serverSelectionTimeoutMS: 5000 })
    .asPromise();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });
  try {
    const rawLogs = await mongo.collection("smslogs").find({}).toArray();
    const logs = rawLogs.map(normalizeMongoSmsLog);
    validateSmsLogs(logs);
    const [target] = await pool.query(
      "select count(*)::int as count from sms_log_entries",
    );
    console.log(
      `Validated ${logs.length} Mongo SMS log(s); Neon already has ${target.rows[0].count} log row(s).`,
    );
    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let imported = 0;
      for (const log of logs) {
        const result = await client.query(
          `insert into sms_log_entries (
            id, recipients, message, segments, status, provider_status,
            provider_message, error_code, raw, sent_by, created_at, updated_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          ) on conflict (id) do nothing`,
          [
            log.id,
            log.recipients,
            log.message,
            log.segments,
            log.status,
            log.providerStatus,
            log.providerMessage,
            log.errorCode,
            JSON.stringify(log.raw),
            log.sentBy,
            log.createdAt,
            log.updatedAt,
          ],
        );
        imported += result.rowCount;
      }
      await client.query("commit");
      console.log(
        `Imported ${imported} Mongo SMS log record(s); skipped ${logs.length - imported} existing ID(s).`,
      );
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await Promise.all([mongo.close(), pool.end()]);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  await main();
}
