import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  normalizeMongoSmsSetting,
  validateSmsSetting,
} from "../scripts/import-sms-setting-to-neon.js";
import { auditLogs } from "../src/db/schema.js";
import {
  serializeSmsSetting,
  smsSettingEntries,
} from "../src/models/SmsSetting.js";
import { getSmsSetting } from "../src/sms-settings/sms-settings.repository.js";
import { SmsSettingsService } from "../src/sms-settings/sms-settings.service.js";

test("SMS setting schema normalizes provider configuration and OTP controls", () => {
  const table = getTableConfig(smsSettingEntries);
  assert.equal(table.name, "sms_setting_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "provider",
      "api_key",
      "gateway_url",
      "gateway_api_key",
      "gateway_api_key_variable",
      "gateway_sms_type",
      "sender_id",
      "signature",
      "enabled",
      "two_factor_enabled",
      "otp_expiry_seconds",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(table.columns[0].default, "default");
  assert.equal(
    table.columns.find((column) => column.name === "provider").default,
    "bulksmsbd",
  );
  assert.equal(
    table.columns.find((column) => column.name === "enabled").default,
    false,
  );
  assert.equal(
    table.columns.find((column) => column.name === "otp_expiry_seconds")
      .default,
    60,
  );
  assert.equal(table.checks.length, 4);
});

test("SMS setting serializer preserves Mongo-compatible singleton ID", () => {
  const setting = serializeSmsSetting({
    id: "default",
    provider: "rtcom",
    enabled: true,
  });
  assert.equal(setting.id, "default");
  assert.equal(setting._id, "default");
  assert.equal(setting.provider, "rtcom");
});

test("SMS setting repository creates default row and returns the configured singleton", async () => {
  const calls = [];
  const row = { id: "default", provider: "bulksmsbd", enabled: false };
  const database = {
    insert(table) {
      calls.push(["insert", table]);
      return {
        values(values) {
          calls.push(["values", values]);
          return {
            onConflictDoNothing: async (config) =>
              calls.push(["onConflictDoNothing", config]),
          };
        },
      };
    },
    select() {
      return {
        from(table) {
          calls.push(["from", table]);
          return {
            where(condition) {
              calls.push(["where", condition]);
              return {
                limit: async (limit) => {
                  calls.push(["limit", limit]);
                  return [row];
                },
              };
            },
          };
        },
      };
    },
  };

  assert.equal((await getSmsSetting(database)).id, "default");
  assert.equal(calls[0][1], smsSettingEntries);
  assert.deepEqual(calls[1][1], { id: "default" });
  assert.equal(calls[2][0], "onConflictDoNothing");
  assert.equal(calls[3][1], smsSettingEntries);
});

test("SMS settings update trims strings, preserves omitted fields, and clamps OTP expiry", async () => {
  const existing = {
    id: "default",
    provider: "bulksmsbd",
    apiKey: " old ",
    gatewayUrl: "",
    gatewayApiKey: "",
    gatewayApiKeyVariable: "api_key",
    gatewaySmsType: "url",
    senderId: "",
    signature: "",
    enabled: false,
    twoFactorEnabled: false,
    otpExpirySeconds: 60,
  };
  let updates;
  let auditWrites = 0;
  const database = {
    insert(table) {
      if (table === auditLogs) {
        return {
          values(values) {
            auditWrites += 1;
            return {
              returning: async () => [
                { id: "audit-1", document: values.document },
              ],
            };
          },
        };
      }
      return {
        values() {
          return { onConflictDoNothing: async () => {} };
        },
      };
    },
    select() {
      return {
        from() {
          return {
            where() {
              return { limit: async () => [existing] };
            },
          };
        },
      };
    },
    update(table) {
      assert.equal(table, smsSettingEntries);
      return {
        set(values) {
          updates = values;
          return {
            where() {
              return {
                returning: async () => [{ ...existing, ...values }],
              };
            },
          };
        },
      };
    },
  };
  const setting = await new SmsSettingsService(database).updateSettings(
    { apiKey: "  new-key ", otpExpirySeconds: 1000 },
    { user: {}, headers: {} },
  );
  assert.equal(updates.apiKey, "new-key");
  assert.equal(updates.otpExpirySeconds, 900);
  assert.equal(updates.enabled, undefined);
  assert.equal(setting.apiKey, "new-key");
  assert.equal(setting.otpExpirySeconds, 900);
  assert.equal(auditWrites, 1);
});

test("SMS settings audit failures are surfaced instead of returning success", async () => {
  const existing = {
    id: "default",
    twoFactorEnabled: false,
    otpExpirySeconds: 60,
  };
  const database = {
    insert(table) {
      if (table === auditLogs) {
        return {
          values() {
            return {
              returning: async () => {
                throw new Error("audit unavailable");
              },
            };
          },
        };
      }
      return {
        values() {
          return { onConflictDoNothing: async () => {} };
        },
      };
    },
    select() {
      return {
        from() {
          return {
            where() {
              return { limit: async () => [existing] };
            },
          };
        },
      };
    },
    update() {
      return {
        set(values) {
          return {
            where() {
              return {
                returning: async () => [{ ...existing, ...values }],
              };
            },
          };
        },
      };
    },
  };
  await assert.rejects(
    new SmsSettingsService(database).updateSettings(
      { twoFactorEnabled: true },
      { user: {}, headers: {} },
    ),
    /audit unavailable/,
  );
});

test("manual SMS request validation fails before attempting delivery", async () => {
  const service = new SmsSettingsService({});
  await assert.rejects(
    service.send({ message: "Hello" }),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message ===
        "Please provide at least one phone number",
  );
  await assert.rejects(
    service.send({ numbers: "01712345678", message: " " }),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message === "Message cannot be empty",
  );
});

test("Mongo SMS setting import preserves provider credentials and flags", () => {
  const setting = normalizeMongoSmsSetting({
    provider: "rtcom",
    apiKey: "bulk-key",
    gatewayUrl: "https://sms.example.test/send",
    gatewayApiKey: "gateway-key",
    gatewayApiKeyVariable: "token",
    gatewaySmsType: "url",
    senderId: "Apple IT",
    signature: "Store",
    enabled: true,
    twoFactorEnabled: true,
    otpExpirySeconds: 120,
  });
  assert.equal(setting.provider, "rtcom");
  assert.equal(setting.apiKey, "bulk-key");
  assert.equal(setting.gatewayApiKey, "gateway-key");
  assert.equal(setting.gatewayApiKeyVariable, "token");
  assert.equal(setting.enabled, true);
  assert.equal(setting.twoFactorEnabled, true);
  assert.equal(setting.otpExpirySeconds, 120);
});

test("Mongo SMS setting import rejects invalid provider or OTP range", () => {
  assert.throws(
    () =>
      validateSmsSetting(
        normalizeMongoSmsSetting({
          provider: "unsupported",
          gatewaySmsType: "url",
          otpExpirySeconds: 60,
        }),
      ),
    /do not satisfy Neon constraints/,
  );
  assert.throws(
    () =>
      validateSmsSetting(
        normalizeMongoSmsSetting({
          provider: "bulksmsbd",
          gatewaySmsType: "url",
          otpExpirySeconds: 10,
        }),
      ),
    /do not satisfy Neon constraints/,
  );
});
