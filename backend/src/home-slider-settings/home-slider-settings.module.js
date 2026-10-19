import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { HomeSliderSettingsController } from "./home-slider-settings.controller.js";
import { HomeSliderSettingsService } from "./home-slider-settings.service.js";

class HomeSliderSettingsModule {}

Module({
  controllers: [HomeSliderSettingsController],
  providers: [HomeSliderSettingsService, LegacyAdminGuard],
})(HomeSliderSettingsModule);

export default HomeSliderSettingsModule;
