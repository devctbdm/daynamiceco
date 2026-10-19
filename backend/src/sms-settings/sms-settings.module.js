import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { SmsSettingsController } from "./sms-settings.controller.js";
import { SmsSettingsService } from "./sms-settings.service.js";

class SmsSettingsModule {}

Module({
  controllers: [SmsSettingsController],
  providers: [SmsSettingsService, LegacyAdminGuard],
})(SmsSettingsModule);

export default SmsSettingsModule;
