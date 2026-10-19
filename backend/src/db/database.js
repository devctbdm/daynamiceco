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

  pool = new Pool({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX || 10),
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
