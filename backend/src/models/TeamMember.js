import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const teamMemberEntries = pgTable(
  "team_member_entries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("manager"),
    active: boolean("active").notNull().default(true),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    password: text("password"),
    phone: text("phone").notNull().default(""),
    avatar: text("avatar").notNull().default(""),
    permissionGroup: text("permission_group"),
    customPermissions: jsonb("custom_permissions").notNull().default([]),
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
    uniqueIndex("team_member_entries_email_uidx").on(table.email),
    index("team_member_entries_role_active_idx").on(table.role, table.active),
    index("team_member_entries_permission_group_idx").on(table.permissionGroup),
    check(
      "team_member_entries_name_length_check",
      sql`length(trim(${table.name})) >= 1`,
    ),
    check(
      "team_member_entries_role_check",
      sql`${table.role} in ('admin', 'manager', 'super_admin')`,
    ),
    check(
      "team_member_entries_custom_permissions_array_check",
      sql`jsonb_typeof(${table.customPermissions}) = 'array'`,
    ),
  ],
);

export function serializeTeamMember(row, { includeSensitive = false } = {}) {
  if (!row) return null;
  const {
    id,
    password,
    twoFactorOtp,
    twoFactorOtpExpire,
    twoFactorAttempts,
    loginAttempts,
    lockUntil,
    ...member
  } = row;
  return {
    ...member,
    _id: id,
    id,
    permissionGroup: member.permissionGroup ?? null,
    customPermissions: Array.isArray(member.customPermissions)
      ? member.customPermissions
      : [],
    ...(includeSensitive
      ? {
          password,
          twoFactorOtp,
          twoFactorOtpExpire,
          twoFactorAttempts,
          loginAttempts,
          lockUntil,
        }
      : {}),
  };
}
