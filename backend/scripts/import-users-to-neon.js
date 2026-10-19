import "dotenv/config";
import crypto from "node:crypto";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";
import { defaultAddress } from "../src/models/User.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-users";

export function normalizeMongoUser(document) {
  const now = new Date();
  const email = String(document.email ?? "")
    .trim()
    .toLowerCase();
  const address =
    document.address && typeof document.address === "object"
      ? { ...defaultAddress(), ...document.address }
      : defaultAddress();
  const addresses = Array.isArray(document.addresses)
    ? document.addresses.map((entry) => ({
        _id: String(entry._id ?? crypto.randomBytes(12).toString("hex")),
        label: entry.label || "Home",
        fullName: entry.fullName || "",
        phone: entry.phone || "",
        street: entry.street || "",
        city: entry.city || "",
        state: entry.state || "",
        postcode: entry.postcode || "",
        country: entry.country || "Bangladesh",
        deliveryArea: entry.deliveryArea || "",
        isDefault: entry.isDefault === true,
      }))
    : [];

  return {
    id: String(document._id ?? ""),
    name: String(document.name ?? "").trim(),
    email,
    password: String(document.password ?? ""),
    phone: String(document.phone ?? "").trim(),
    address,
    addresses,
    role: document.role || "customer",
    status: document.status || "active",
    resetPasswordToken: document.resetPasswordToken ?? null,
    resetPasswordExpire: toDate(document.resetPasswordExpire),
    twoFactorOtp: document.twoFactorOtp ?? null,
    twoFactorOtpExpire: toDate(document.twoFactorOtpExpire),
    twoFactorAttempts: Number(document.twoFactorAttempts) || 0,
    loginAttempts: Number(document.loginAttempts) || 0,
    lockUntil: toDate(document.lockUntil),
    createdAt: toDate(document.createdAt) ?? now,
    updatedAt: toDate(document.updatedAt) ?? now,
  };
}

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Mongo user data contains an invalid date");
  }
  return date;
}

function validateUsers(users) {
  const invalid = users.filter(
    (user) =>
      !/^[a-f\d]{24}$/i.test(user.id) ||
      !user.name ||
      user.name.length > 50 ||
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(user.email) ||
      !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password) ||
      !user.phone ||
      !["super_admin", "admin", "manager", "customer"].includes(user.role) ||
      !["active", "inactive", "suspended"].includes(user.status),
  );
  if (invalid.length) {
    throw new Error(
      `${invalid.length} Mongo user record(s) do not satisfy the Neon user constraints; import stopped without writing data`,
    );
  }

  const emails = new Set();
  for (const user of users) {
    if (emails.has(user.email)) {
      throw new Error(
        "Mongo user collection has duplicate normalized emails; import stopped without writing data",
      );
    }
    emails.add(user.email);
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-users to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes user records to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
    );
  }
  if (!process.env.DB_URI) throw new Error("DB_URI must be configured");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured");
  }

  const mongoose = await loadMongoose();
  const mongo = await mongoose
    .createConnection(process.env.DB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });

  try {
    const rawUsers = await mongo.collection("users").find({}).toArray();
    const users = rawUsers.map(normalizeMongoUser);
    validateUsers(users);
    const [target] = await pool.query(
      "select count(*)::int as count from user_entries",
    );
    console.log(
      `Validated ${users.length} Mongo user(s); Neon already has ${target.rows[0].count} user row(s).`,
    );

    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let imported = 0;
      for (const user of users) {
        const result = await client.query(
          `insert into user_entries (
            id, name, email, password, phone, address, addresses, role, status,
            reset_password_token, reset_password_expire, two_factor_otp,
            two_factor_otp_expire, two_factor_attempts, login_attempts,
            lock_until, created_at, updated_at
          ) values (
            $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, $18
          ) on conflict (id) do nothing`,
          [
            user.id,
            user.name,
            user.email,
            user.password,
            user.phone,
            JSON.stringify(user.address),
            JSON.stringify(user.addresses),
            user.role,
            user.status,
            user.resetPasswordToken,
            user.resetPasswordExpire,
            user.twoFactorOtp,
            user.twoFactorOtpExpire,
            user.twoFactorAttempts,
            user.loginAttempts,
            user.lockUntil,
            user.createdAt,
            user.updatedAt,
          ],
        );
        imported += result.rowCount;
      }
      await client.query("commit");
      console.log(
        `Imported ${imported} Mongo user record(s); skipped ${users.length - imported} existing ID(s).`,
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
