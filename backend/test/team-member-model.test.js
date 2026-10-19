import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  serializeTeamMember,
  teamMemberEntries,
} from "../src/models/TeamMember.js";
import { TeamMembersService } from "../src/team-members/team-members.service.js";
import { normalizeMongoTeamMember } from "../scripts/import-team-members-to-neon.js";

test("team member storage is normalized and keeps the staging table separate", () => {
  const table = getTableConfig(teamMemberEntries);
  assert.equal(table.name, "team_member_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "name",
      "email",
      "role",
      "active",
      "last_login",
      "password",
      "phone",
      "avatar",
      "permission_group",
      "custom_permissions",
      "two_factor_otp",
      "two_factor_otp_expire",
      "two_factor_attempts",
      "login_attempts",
      "lock_until",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(table.indexes.length, 3);
  assert.equal(table.checks.length, 3);
  assert.equal(table.columns[6].notNull, false);
});

test("team member serialization hides authentication secrets by default", () => {
  const member = serializeTeamMember({
    id: "0123456789abcdef01234567",
    name: "Staff",
    password: "bcrypt-hash",
    twoFactorOtp: "hashed-otp",
    twoFactorOtpExpire: new Date(),
    twoFactorAttempts: 2,
    loginAttempts: 1,
    lockUntil: null,
    customPermissions: null,
  });
  assert.equal(member._id, member.id);
  assert.deepEqual(member.customPermissions, []);
  for (const field of [
    "password",
    "twoFactorOtp",
    "twoFactorOtpExpire",
    "twoFactorAttempts",
    "loginAttempts",
    "lockUntil",
  ]) {
    assert.equal(Object.hasOwn(member, field), false);
  }
});

test("team member serialization includes secrets only for authentication", () => {
  const member = serializeTeamMember(
    {
      id: "0123456789abcdef01234567",
      password: "bcrypt-hash",
      twoFactorOtp: "hashed-otp",
      twoFactorOtpExpire: null,
      twoFactorAttempts: 1,
      loginAttempts: 2,
      lockUntil: null,
    },
    { includeSensitive: true },
  );
  assert.equal(member.password, "bcrypt-hash");
  assert.equal(member.twoFactorOtp, "hashed-otp");
  assert.equal(member.loginAttempts, 2);
});

test("Mongo import preserves account IDs, bcrypt hashes, and auth state", () => {
  const member = normalizeMongoTeamMember({
    _id: "0123456789abcdef01234567",
    name: " Staff ",
    email: " STAFF@EXAMPLE.COM ",
    password:
      "$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12345",
    role: "admin",
    permissionGroup: "abcdefabcdefabcdefabcdef",
    twoFactorAttempts: 3,
    loginAttempts: 4,
  });
  assert.equal(member.id, "0123456789abcdef01234567");
  assert.equal(member.name, "Staff");
  assert.equal(member.email, "staff@example.com");
  assert.equal(member.permissionGroup, "abcdefabcdefabcdefabcdef");
  assert.equal(member.twoFactorAttempts, 3);
  assert.equal(member.loginAttempts, 4);
});

test("staff creation rejects invalid credentials and permission definitions", async () => {
  const service = new TeamMembersService();
  await assert.rejects(
    service.createStaff({
      name: "Staff",
      email: "staff@example.com",
      password: "short",
    }),
    (error) => error.getStatus() === 400,
  );
  await assert.rejects(
    service.createStaff({
      name: "Staff",
      email: "staff@example.com",
      password: "long-enough-password",
      customPermissions: [{ module: "unknown", view: true }],
    }),
    (error) => error.getStatus() === 400,
  );
});
