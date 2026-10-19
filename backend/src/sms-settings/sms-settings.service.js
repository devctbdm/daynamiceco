import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../audit/audit.repository.js";
import { smsSettingEntries } from "../models/SmsSetting.js";
import { sendSms as sendSmsService } from "../services/smsService.js";
import { DATABASE } from "../db/database.js";
import { listSmsLogs } from "../sms-logs/sms-logs.repository.js";
import { getSmsSetting } from "./sms-settings.repository.js";

const BULKSMS_BASE = "https://bulksmsbd.net/api";

class SmsSettingsService {
  constructor(database) {
    this.database = database;
  }

  async getSettings() {
    return serializeSettings(await getSmsSetting(this.database));
  }

  async updateSettings(input = {}, request) {
    const existing = await getSmsSetting(this.database);
    const before = {
      twoFactorEnabled: !!existing.twoFactorEnabled,
      otpExpirySeconds: existing.otpExpirySeconds || 60,
    };
    const updates = { updatedAt: new Date() };
    const wantsTwoFactorChange =
      typeof input.twoFactorEnabled === "boolean" ||
      typeof input.otpExpirySeconds === "number";

    if (input.provider === "bulksmsbd" || input.provider === "rtcom") {
      updates.provider = input.provider;
    }
    for (const field of [
      "apiKey",
      "gatewayUrl",
      "gatewayApiKey",
      "senderId",
      "signature",
    ]) {
      if (typeof input[field] === "string")
        updates[field] = input[field].trim();
    }
    if (typeof input.gatewayApiKeyVariable === "string") {
      updates.gatewayApiKeyVariable =
        input.gatewayApiKeyVariable.trim() || "api_key";
    }
    if (input.gatewaySmsType === "url") updates.gatewaySmsType = "url";
    if (typeof input.enabled === "boolean") updates.enabled = input.enabled;
    if (typeof input.twoFactorEnabled === "boolean") {
      updates.twoFactorEnabled = input.twoFactorEnabled;
    }
    if (typeof input.otpExpirySeconds === "number") {
      updates.otpExpirySeconds = Math.min(
        900,
        Math.max(15, Math.floor(input.otpExpirySeconds)),
      );
    }

    const [row] = await this.database
      .update(smsSettingEntries)
      .set(updates)
      .where(eq(smsSettingEntries.id, existing.id))
      .returning();
    if (!row) throw new Error("Failed to update SMS settings");

    if (wantsTwoFactorChange) {
      await createAuditLog(
        {
          actor: {
            id: request.user?.id ?? request.user?._id,
            name: request.user?.name,
            role: request.user?.role,
          },
          action: "update_2fa_settings",
          target: "SmsSetting",
          changes: {
            before,
            after: {
              twoFactorEnabled: !!row.twoFactorEnabled,
              otpExpirySeconds: row.otpExpirySeconds || 60,
            },
          },
          ip: request.ip || request.connection?.remoteAddress || "",
          userAgent: request.headers["user-agent"] || "",
        },
        this.database,
      );
    }
    return serializeSettings(row);
  }

  async getBalance() {
    const setting = await getSmsSetting(this.database);
    if (!setting.apiKey) {
      throw new BadRequestException({
        success: false,
        message: "API key not configured. Save it in SMS settings first.",
      });
    }
    try {
      const url = `${BULKSMS_BASE}/getBalanceApi?api_key=${encodeURIComponent(setting.apiKey)}`;
      const response = await fetch(url);
      const data = await response.json();
      const balance =
        data?.balance ?? data?.data?.balance ?? data?.currentBalance ?? null;
      return {
        success: true,
        balance: balance != null && balance !== "" ? Number(balance) : null,
        raw: data,
      };
    } catch (error) {
      console.error("SMS Balance Error:", error);
      throw new InternalServerErrorException({
        success: false,
        message: error.message,
      });
    }
  }

  async send(input = {}) {
    const { numbers, message, senderId } = input;
    if (!numbers) {
      throw new BadRequestException({
        success: false,
        message: "Please provide at least one phone number",
      });
    }
    if (!message || !String(message).trim()) {
      throw new BadRequestException({
        success: false,
        message: "Message cannot be empty",
      });
    }
    const result = await sendSmsService({ numbers, message, senderId });
    if (result.skipped) {
      throw new BadRequestException({
        success: false,
        message: result.reason,
      });
    }
    if (result.numbers.length === 0) {
      throw new BadRequestException({
        success: false,
        message: result.reason || "No valid Bangladesh phone numbers provided",
      });
    }
    return {
      success: result.success,
      log: result.log,
      provider: result.log?.raw || {},
      providerMessage: result.log?.providerMessage || "",
      numbers: result.numbers,
    };
  }

  async getLogs(query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(query.limit, 10) || 15),
    );
    const { total, logs } = await listSmsLogs({ page, limit }, this.database);
    return {
      success: true,
      logs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}

function serializeSettings(setting) {
  return {
    provider: setting.provider || "bulksmsbd",
    apiKey: setting.apiKey || "",
    gatewayUrl: setting.gatewayUrl || "",
    gatewayApiKey: setting.gatewayApiKey || "",
    gatewayApiKeyVariable: setting.gatewayApiKeyVariable || "api_key",
    gatewaySmsType: setting.gatewaySmsType || "url",
    senderId: setting.senderId || "",
    signature: setting.signature || "",
    enabled: !!setting.enabled,
    twoFactorEnabled: !!setting.twoFactorEnabled,
    otpExpirySeconds: setting.otpExpirySeconds || 60,
  };
}

Injectable()(SmsSettingsService);
Inject(DATABASE)(SmsSettingsService, undefined, 0);

export { SmsSettingsService };
