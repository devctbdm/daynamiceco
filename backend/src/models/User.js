import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userEntries = pgTable(
  "user_entries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    phone: text("phone").notNull(),
    address: jsonb("address").notNull().default({
      street: "",
      city: "Dhaka",
      state: "Dhaka",
      postcode: "1000",
      country: "Bangladesh",
    }),
    addresses: jsonb("addresses").notNull().default([]),
    role: text("role").notNull().default("customer"),
    status: text("status").notNull().default("active"),
    resetPasswordToken: text("reset_password_token"),
    resetPasswordExpire: timestamp("reset_password_expire", {
      withTimezone: true,
    }),
    twoFactorOtp: text("two_factor_otp"),
    twoFactorOtpExpire: timestamp("two_factor_otp_expire", {
      withTimezone: true,
    }),
    twoFactorAttempts: integer("two_factor_attempts").notNull().default(0),
    loginAttempts: integer("login_attempts").notNull().default(0),
    lockUntil: timestamp("lock_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_entries_email_uidx").on(table.email),
    index("user_entries_role_created_at_idx").on(table.role, table.createdAt),
    index("user_entries_status_idx").on(table.status),
    check(
      "user_entries_name_length_check",
      sql`length(trim(${table.name})) between 1 and 50`,
    ),
    check(
      "user_entries_email_check",
      sql`${table.email} ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'`,
    ),
    check(
      "user_entries_password_length_check",
      sql`length(${table.password}) >= 6`,
    ),
    check("user_entries_phone_check", sql`length(trim(${table.phone})) > 0`),
    check(
      "user_entries_role_check",
      sql`${table.role} in ('super_admin', 'admin', 'manager', 'customer')`,
    ),
    check(
      "user_entries_status_check",
      sql`${table.status} in ('active', 'inactive', 'suspended')`,
    ),
  ],
);

export function serializeUser(row, { includeSensitive = false } = {}) {
  if (!row) return null;
  const {
    id,
    resetPasswordToken,
    resetPasswordExpire,
    twoFactorOtp,
    twoFactorOtpExpire,
    twoFactorAttempts,
    loginAttempts,
    lockUntil,
    password,
    ...user
  } = row;
  return {
    ...user,
    _id: id,
    id,
    address: user.address ?? defaultAddress(),
    addresses: Array.isArray(user.addresses) ? user.addresses : [],
    ...(includeSensitive
      ? {
          password,
          resetPasswordToken,
          resetPasswordExpire,
          twoFactorOtp,
          twoFactorOtpExpire,
          twoFactorAttempts,
          loginAttempts,
          lockUntil,
        }
      : {}),
  };
}

export function defaultAddress() {
  return {
    street: "",
    city: "Dhaka",
    state: "Dhaka",
    postcode: "1000",
    country: "Bangladesh",
  };
}
