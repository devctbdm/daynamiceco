import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { StoreSettingsController } from "./store-settings.controller.js";
import { StoreSettingsService } from "./store-settings.service.js";

class StoreSettingsModule {}

Module({
  controllers: [StoreSettingsController],
  providers: [StoreSettingsService, LegacyAdminGuard],
})(StoreSettingsModule);

export default StoreSettingsModule;
