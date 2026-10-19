import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { SmsSettingsService } from "./sms-settings.service.js";

class SmsSettingsController {
  constructor(smsSettingsService) {
    this.smsSettingsService = smsSettingsService;
  }

  async getSettings() {
    return {
      success: true,
      settings: await this.smsSettingsService.getSettings(),
    };
  }

  async updateSettings(request, body) {
    return {
      success: true,
      settings: await this.smsSettingsService.updateSettings(body, request),
    };
  }

  getBalance() {
    return this.smsSettingsService.getBalance();
  }

  getLogs(query) {
    return this.smsSettingsService.getLogs(query);
  }

  send(body) {
    return this.smsSettingsService.send(body);
  }
}

Controller("sms")(SmsSettingsController);
Inject(SmsSettingsService)(SmsSettingsController, undefined, 0);

const descriptor = (method) =>
  Object.getOwnPropertyDescriptor(SmsSettingsController.prototype, method);

for (const method of [
  "getSettings",
  "updateSettings",
  "getBalance",
  "getLogs",
  "send",
]) {
  UseGuards(LegacyAdminGuard)(
    SmsSettingsController.prototype,
    method,
    descriptor(method),
  );
}

Get("settings")(
  SmsSettingsController.prototype,
  "getSettings",
  descriptor("getSettings"),
);
Put("settings")(
  SmsSettingsController.prototype,
  "updateSettings",
  descriptor("updateSettings"),
);
HttpCode(200)(
  SmsSettingsController.prototype,
  "updateSettings",
  descriptor("updateSettings"),
);
Req()(SmsSettingsController.prototype, "updateSettings", 0);
Body()(SmsSettingsController.prototype, "updateSettings", 1);
Get("balance")(
  SmsSettingsController.prototype,
  "getBalance",
  descriptor("getBalance"),
);
Get("logs")(SmsSettingsController.prototype, "getLogs", descriptor("getLogs"));
Query()(SmsSettingsController.prototype, "getLogs", 0);
Post("send")(SmsSettingsController.prototype, "send", descriptor("send"));
HttpCode(200)(SmsSettingsController.prototype, "send", descriptor("send"));
Body()(SmsSettingsController.prototype, "send", 0);

export { SmsSettingsController };
