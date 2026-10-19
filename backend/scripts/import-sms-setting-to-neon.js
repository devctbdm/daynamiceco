import "dotenv/config";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-sms-setting";

export function normalizeMongoSmsSetting(document) {
  return {
    provider: document.provider || "bulksmsbd",
    apiKey: String(document.apiKey ?? ""),
    gatewayUrl: String(document.gatewayUrl ?? ""),
    gatewayApiKey: String(document.gatewayApiKey ?? ""),
    gatewayApiKeyVariable: String(document.gatewayApiKeyVariable || "api_key"),
    gatewaySmsType: document.gatewaySmsType || "url",
    senderId: String(document.senderId ?? ""),
    signature: String(document.signature ?? ""),
    enabled: document.enabled === true,
    twoFactorEnabled: document.twoFactorEnabled === true,
    otpExpirySeconds: Number(document.otpExpirySeconds ?? 60),
  };
}

export function validateSmsSetting(setting) {
  if (
    !["bulksmsbd", "rtcom"].includes(setting.provider) ||
    setting.gatewaySmsType !== "url" ||
    !Number.isInteger(setting.otpExpirySeconds) ||
    setting.otpExpirySeconds < 15 ||
    setting.otpExpirySeconds > 900
  ) {
    throw new Error(
      "Mongo SMS settings do not satisfy Neon constraints; import stopped without writing data",
    );
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-sms-setting to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes SMS settings to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
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
    const [document] = await mongo
      .collection("smssettings")
      .find({})
      .limit(1)
      .toArray();
    const setting = normalizeMongoSmsSetting(document ?? {});
    validateSmsSetting(setting);
    const [target] = await pool.query(
      "select count(*)::int as count from sms_setting_entries",
    );
    console.log(
      `Validated Mongo SMS settings; Neon already has ${target.rows[0].count} SMS settings row(s).`,
    );
    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const result = await pool.query(
      `insert into sms_setting_entries (
        id, provider, api_key, gateway_url, gateway_api_key,
        gateway_api_key_variable, gateway_sms_type, sender_id, signature,
        enabled, two_factor_enabled, otp_expiry_seconds
      ) values (
        'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) on conflict (id) do nothing`,
      [
        setting.provider,
        setting.apiKey,
        setting.gatewayUrl,
        setting.gatewayApiKey,
        setting.gatewayApiKeyVariable,
        setting.gatewaySmsType,
        setting.senderId,
        setting.signature,
        setting.enabled,
        setting.twoFactorEnabled,
        setting.otpExpirySeconds,
      ],
    );
    console.log(
      result.rowCount
        ? "Imported SMS settings into Neon."
        : "Neon already has SMS settings; existing values were preserved.",
    );
  } finally {
    await Promise.all([mongo.close(), pool.end()]);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  await main();
}
