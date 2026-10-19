import "dotenv/config";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-notifications";
const CATEGORIES = ["order", "delivery", "rider", "payment", "system"];

export function normalizeMongoNotification(document) {
  const now = new Date();
  return {
    id: String(document._id ?? ""),
    category: document.category || "system",
    title: String(document.title ?? ""),
    description: String(document.description ?? ""),
    link: String(document.link ?? ""),
    read: document.read === true,
    orderId: document.order == null ? null : String(document.order),
    createdAt: toDate(document.createdAt) ?? now,
    updatedAt: toDate(document.updatedAt) ?? now,
  };
}

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Mongo notification data contains an invalid date");
  }
  return date;
}

export function validateNotifications(notifications) {
  const invalid = notifications.filter(
    (notification) =>
      !/^[a-f\d]{24}$/i.test(notification.id) ||
      !CATEGORIES.includes(notification.category) ||
      !notification.title.trim() ||
      !notification.description.trim() ||
      typeof notification.read !== "boolean",
  );
  if (invalid.length) {
    throw new Error(
      `${invalid.length} Mongo notification record(s) are invalid; import stopped without writing data`,
    );
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-notifications to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes notifications to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
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
    const rawNotifications = await mongo
      .collection("notifications")
      .find({})
      .toArray();
    const notifications = rawNotifications.map(normalizeMongoNotification);
    validateNotifications(notifications);
    const [target] = await pool.query(
      "select count(*)::int as count from notification_entries",
    );
    console.log(
      `Validated ${notifications.length} Mongo notification(s); Neon already has ${target.rows[0].count} notification row(s).`,
    );
    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let imported = 0;
      for (const notification of notifications) {
        const result = await client.query(
          `insert into notification_entries (
            id, category, title, description, link, read, order_id,
            created_at, updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do nothing`,
          [
            notification.id,
            notification.category,
            notification.title,
            notification.description,
            notification.link,
            notification.read,
            notification.orderId,
            notification.createdAt,
            notification.updatedAt,
          ],
        );
        imported += result.rowCount;
      }
      await client.query("commit");
      console.log(
        `Imported ${imported} Mongo notification record(s); skipped ${notifications.length - imported} existing ID(s).`,
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
