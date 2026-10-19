import "dotenv/config";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-sessions";

export function normalizeMongoSession(document) {
  const now = new Date();
  return {
    id: String(document._id ?? ""),
    user: String(document.user ?? ""),
    device: String(document.device || "Unknown"),
    browser: String(document.browser || "Unknown"),
    os: String(document.os || "Unknown"),
    ip: String(document.ip ?? ""),
    location: String(document.location ?? ""),
    lastActive: toDate(document.lastActive) ?? now,
    isCurrent: document.isCurrent === true,
    createdAt: toDate(document.createdAt) ?? now,
    updatedAt: toDate(document.updatedAt) ?? now,
  };
}

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Mongo session data contains an invalid date");
  }
  return date;
}

export function validateSessions(sessions) {
  const invalid = sessions.filter(
    (session) =>
      !/^[a-f\d]{24}$/i.test(session.id) ||
      !/^[a-f\d]{24}$/i.test(session.user),
  );
  if (invalid.length) {
    throw new Error(
      `${invalid.length} Mongo session record(s) have invalid session or user IDs; import stopped without writing data`,
    );
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-sessions to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes session records to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
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
    const rawSessions = await mongo.collection("sessions").find({}).toArray();
    const sessions = rawSessions.map(normalizeMongoSession);
    validateSessions(sessions);
    const [target] = await pool.query(
      "select count(*)::int as count from session_entries",
    );
    console.log(
      `Validated ${sessions.length} Mongo session(s); Neon already has ${target.rows[0].count} session row(s).`,
    );
    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let imported = 0;
      for (const session of sessions) {
        const result = await client.query(
          `insert into session_entries (
            id, "user", device, browser, os, ip, location, last_active,
            is_current, created_at, updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          on conflict (id) do nothing`,
          [
            session.id,
            session.user,
            session.device,
            session.browser,
            session.os,
            session.ip,
            session.location,
            session.lastActive,
            session.isCurrent,
            session.createdAt,
            session.updatedAt,
          ],
        );
        imported += result.rowCount;
      }
      await client.query("commit");
      console.log(
        `Imported ${imported} Mongo session record(s); skipped ${sessions.length - imported} existing ID(s).`,
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
