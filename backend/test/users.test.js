import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { normalizeMongoUser } from "../scripts/import-users-to-neon.js";
import { serializeUser, userEntries } from "../src/models/User.js";
import { UsersService, validateUser } from "../src/users/users.service.js";

test("user table normalizes account fields and enforces roles and uniqueness", () => {
  const table = getTableConfig(userEntries);
  assert.equal(table.name, "user_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "name",
      "email",
      "password",
      "phone",
      "address",
      "addresses",
      "role",
      "status",
      "reset_password_token",
      "reset_password_expire",
      "two_factor_otp",
      "two_factor_otp_expire",
      "two_factor_attempts",
      "login_attempts",
      "lock_until",
      "created_at",
      "updated_at",
    ],
  );
  assert.ok(
    table.indexes.some(
      (index) => index.config.name === "user_entries_email_uidx",
    ),
  );
  assert.equal(table.checks.length, 6);
});

test("user serializer hides password and account recovery secrets", () => {
  const user = {
    id: "0123456789abcdef01234567",
    name: "New Customer",
    email: "customer@example.test",
    password: "$2a$10$hash",
    phone: "01234567890",
    address: { city: "Dhaka" },
    addresses: [],
    role: "customer",
    status: "active",
    resetPasswordToken: "reset-hash",
    resetPasswordExpire: new Date("2026-10-18T12:00:00.000Z"),
    twoFactorOtp: "otp-hash",
    twoFactorOtpExpire: new Date("2026-10-18T12:00:00.000Z"),
    twoFactorAttempts: 1,
    loginAttempts: 2,
    lockUntil: null,
  };
  const publicUser = serializeUser(user);
  assert.equal(publicUser._id, user.id);
  assert.equal(publicUser.password, undefined);
  assert.equal(publicUser.twoFactorOtp, undefined);
  assert.equal(publicUser.resetPasswordToken, undefined);

  const privateUser = serializeUser(user, { includeSensitive: true });
  assert.equal(privateUser.password, user.password);
  assert.equal(privateUser.twoFactorOtp, user.twoFactorOtp);
  assert.equal(privateUser.loginAttempts, 2);
});

test("Mongo user import preserves IDs and existing bcrypt hashes", () => {
  const imported = normalizeMongoUser({
    _id: "0123456789abcdef01234567",
    name: "  Example Customer ",
    email: " CUSTOMER@example.test ",
    password: "$2a$10$existinghash",
    phone: "01234567890",
    role: "customer",
    status: "active",
    address: { city: "Chattogram" },
    addresses: [{ _id: "1123456789abcdef01234567", isDefault: true }],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });
  assert.equal(imported.id, "0123456789abcdef01234567");
  assert.equal(imported.name, "Example Customer");
  assert.equal(imported.email, "customer@example.test");
  assert.equal(imported.password, "$2a$10$existinghash");
  assert.equal(imported.address.city, "Chattogram");
  assert.equal(imported.addresses[0]._id, "1123456789abcdef01234567");
});

test("user validation rejects invalid data before accessing Neon", async () => {
  assert.throws(
    () =>
      validateUser({
        name: "Valid Name",
        email: "not-an-email",
        password: "short",
        phone: "123",
      }),
    (error) => error.getStatus() === 400,
  );

  const database = {
    select() {
      assert.fail("Invalid registration must not query the database");
    },
    insert() {
      assert.fail("Invalid registration must not write to the database");
    },
  };
  await assert.rejects(
    new UsersService(database).register({
      name: "Valid Name",
      email: "valid@example.com",
      password: "short",
      phone: "1234567",
    }),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message === "Password must be at least 6 characters",
  );
});
