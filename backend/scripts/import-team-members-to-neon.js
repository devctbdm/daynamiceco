import "dotenv/config";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-team-members";

export function normalizeMongoTeamMember(document) {
  const now = new Date();
  return {
    id: String(document._id ?? ""),
    name: String(document.name ?? "").trim(),
    email: String(document.email ?? "")
      .trim()
      .toLowerCase(),
    role: document.role || "manager",
    active: document.active !== false,
    lastLogin: toDate(document.lastLogin),
    password: document.password ? String(document.password) : null,
    phone: String(document.phone ?? "").trim(),
    avatar: String(document.avatar ?? ""),
    permissionGroup: document.permissionGroup
      ? String(document.permissionGroup)
      : null,
    customPermissions: Array.isArray(document.customPermissions)
      ? document.customPermissions
      : [],
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
    throw new Error("Mongo team member data contains an invalid date");
  }
  return date;
}

function validateTeamMembers(members) {
  const emails = new Set();
  for (const member of members) {
    if (
      !/^[a-f\d]{24}$/i.test(member.id) ||
      !member.name ||
      !member.email ||
      (member.password &&
        !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(member.password)) ||
      !["admin", "manager", "super_admin"].includes(member.role) ||
      !Array.isArray(member.customPermissions)
    ) {
      throw new Error(
        "Mongo team member data does not satisfy Neon constraints; import stopped without writing data",
      );
    }
    if (emails.has(member.email)) {
      throw new Error(
        "Mongo team member collection has duplicate normalized emails; import stopped without writing data",
      );
    }
    emails.add(member.email);
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-team-members to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes team member records to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
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
    const rawMembers = await mongo.collection("teammembers").find({}).toArray();
    const members = rawMembers.map(normalizeMongoTeamMember);
    validateTeamMembers(members);
    const [target] = await pool.query(
      "select count(*)::int as count from team_member_entries",
    );
    console.log(
      `Validated ${members.length} Mongo team member(s); Neon already has ${target.rows[0].count} team member row(s).`,
    );
    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let imported = 0;
      for (const member of members) {
        const result = await client.query(
          `insert into team_member_entries (
            id, name, email, role, active, last_login, password, phone, avatar,
            permission_group, custom_permissions, two_factor_otp,
            two_factor_otp_expire, two_factor_attempts, login_attempts,
            lock_until, created_at, updated_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
            $12, $13, $14, $15, $16, $17, $18
          ) on conflict (id) do nothing`,
          [
            member.id,
            member.name,
            member.email,
            member.role,
            member.active,
            member.lastLogin,
            member.password,
            member.phone,
            member.avatar,
            member.permissionGroup,
            JSON.stringify(member.customPermissions),
            member.twoFactorOtp,
            member.twoFactorOtpExpire,
            member.twoFactorAttempts,
            member.loginAttempts,
            member.lockUntil,
            member.createdAt,
            member.updatedAt,
          ],
        );
        imported += result.rowCount;
      }
      await client.query("commit");
      console.log(
        `Imported ${imported} Mongo team member record(s); skipped ${members.length - imported} existing ID(s).`,
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
