import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Put,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { HomeSliderSettingsService } from "./home-slider-settings.service.js";

class HomeSliderSettingsController {
  constructor(settingsService) {
    this.settingsService = settingsService;
  }

  async getSetting() {
    return {
      success: true,
      setting: await this.settingsService.getSetting(),
    };
  }

  async updateSetting(body) {
    return {
      success: true,
      setting: await this.settingsService.updateSetting(body),
    };
  }
}

Controller("home-slider-texts/setting")(HomeSliderSettingsController);
Inject(HomeSliderSettingsService)(HomeSliderSettingsController, undefined, 0);

Get()(
  HomeSliderSettingsController.prototype,
  "getSetting",
  Object.getOwnPropertyDescriptor(
    HomeSliderSettingsController.prototype,
    "getSetting",
  ),
);

Put()(
  HomeSliderSettingsController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    HomeSliderSettingsController.prototype,
    "updateSetting",
  ),
);
HttpCode(200)(
  HomeSliderSettingsController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    HomeSliderSettingsController.prototype,
    "updateSetting",
  ),
);
UseGuards(LegacyAdminGuard)(
  HomeSliderSettingsController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    HomeSliderSettingsController.prototype,
    "updateSetting",
  ),
);
Body()(HomeSliderSettingsController.prototype, "updateSetting", 0);

export { HomeSliderSettingsController };
