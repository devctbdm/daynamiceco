import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const { Pool } = pg;
let pool;
let database;

export const DATABASE = Symbol("DATABASE");

export function getDatabase() {
  if (database) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured to use PostgreSQL");
  }

  // Headroom matters on Neon cold starts: a burst of parallel admin requests
  // plus the fire-and-forget audit inserts each grab a connection at once, and
  // a starved pool would leave page requests queued behind them (the frontend
  // then sits on its loading skeleton). `connectionTimeoutMillis` fails fast
  // with a retryable 500 instead of hanging forever if the pool is exhausted.
  pool = new Pool({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX || 20),
    connectionTimeoutMillis: Number(
      process.env.DATABASE_CONNECT_TIMEOUT_MS || 15000
    ),
  });
  // drizzle-orm 1.x requires the object form: passing the pool positionally
  // makes it build its own unconfigured (localhost) pool instead.
  database = drizzle({ client: pool, schema });
  return database;
}

export async function closeDatabase() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
  database = undefined;
}
