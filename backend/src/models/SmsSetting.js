import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const smsSettingEntries = pgTable(
  "sms_setting_entries",
  {
    id: text("id").primaryKey().default("default"),
    provider: text("provider").notNull().default("bulksmsbd"),
    apiKey: text("api_key").notNull().default(""),
    gatewayUrl: text("gateway_url").notNull().default(""),
    gatewayApiKey: text("gateway_api_key").notNull().default(""),
    gatewayApiKeyVariable: text("gateway_api_key_variable")
      .notNull()
      .default("api_key"),
    gatewaySmsType: text("gateway_sms_type").notNull().default("url"),
    senderId: text("sender_id").notNull().default(""),
    signature: text("signature").notNull().default(""),
    enabled: boolean("enabled").notNull().default(false),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    otpExpirySeconds: integer("otp_expiry_seconds").notNull().default(60),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("sms_setting_entries_singleton_check", sql`${table.id} = 'default'`),
    check(
      "sms_setting_entries_provider_check",
      sql`${table.provider} in ('bulksmsbd', 'rtcom')`,
    ),
    check(
      "sms_setting_entries_gateway_sms_type_check",
      sql`${table.gatewaySmsType} = 'url'`,
    ),
    check(
      "sms_setting_entries_otp_expiry_check",
      sql`${table.otpExpirySeconds} between 15 and 900`,
    ),
  ],
);

export function serializeSmsSetting(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}
