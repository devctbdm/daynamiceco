import "dotenv/config";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-saved-builds";

export function normalizeMongoSavedBuild(document) {
  const now = new Date();
  return {
    id: String(document._id ?? ""),
    userId: String(document.user ?? ""),
    name: document.name == null ? null : String(document.name).trim(),
    components:
      document.components &&
      typeof document.components === "object" &&
      !Array.isArray(document.components)
        ? document.components
        : {},
    createdAt: toDate(document.createdAt) ?? now,
    updatedAt: toDate(document.updatedAt) ?? now,
  };
}

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Mongo saved build data contains an invalid date");
  }
  return date;
}

export function validateSavedBuilds(builds) {
  const invalid = builds.filter(
    (build) =>
      !/^[a-f\d]{24}$/i.test(build.id) ||
      !/^[a-f\d]{24}$/i.test(build.userId) ||
      (build.name !== null && build.name.length > 80) ||
      !build.components ||
      typeof build.components !== "object" ||
      Array.isArray(build.components),
  );
  if (invalid.length) {
    throw new Error(
      `${invalid.length} Mongo saved build record(s) are invalid; import stopped without writing data`,
    );
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-saved-builds to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes saved builds to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
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
    const rawBuilds = await mongo.collection("savedbuilds").find({}).toArray();
    const builds = rawBuilds.map(normalizeMongoSavedBuild);
    validateSavedBuilds(builds);
    const [target] = await pool.query(
      "select count(*)::int as count from saved_build_entries",
    );
    console.log(
      `Validated ${builds.length} Mongo saved build(s); Neon already has ${target.rows[0].count} build row(s).`,
    );
    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let imported = 0;
      for (const build of builds) {
        const result = await client.query(
          `insert into saved_build_entries (
            id, user_id, name, components, created_at, updated_at
          ) values ($1, $2, $3, $4::jsonb, $5, $6)
          on conflict (id) do nothing`,
          [
            build.id,
            build.userId,
            build.name,
            JSON.stringify(build.components),
            build.createdAt,
            build.updatedAt,
          ],
        );
        imported += result.rowCount;
      }
      await client.query("commit");
      console.log(
        `Imported ${imported} Mongo saved build record(s); skipped ${builds.length - imported} existing ID(s).`,
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
