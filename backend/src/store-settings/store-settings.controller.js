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
import { StoreSettingsService } from "./store-settings.service.js";

class StoreSettingsController {
  constructor(storeSettingsService) {
    this.storeSettingsService = storeSettingsService;
  }

  async getSettings() {
    return {
      success: true,
      settings: await this.storeSettingsService.getSettings(),
    };
  }

  async getPublicSettings() {
    return {
      success: true,
      settings: await this.storeSettingsService.getPublicSettings(),
    };
  }

  async updateSettings(body) {
    return {
      success: true,
      settings: await this.storeSettingsService.updateSettings(body),
    };
  }
}

Controller("store")(StoreSettingsController);
Inject(StoreSettingsService)(StoreSettingsController, undefined, 0);

Get("public")(
  StoreSettingsController.prototype,
  "getPublicSettings",
  Object.getOwnPropertyDescriptor(
    StoreSettingsController.prototype,
    "getPublicSettings",
  ),
);
Get()(
  StoreSettingsController.prototype,
  "getSettings",
  Object.getOwnPropertyDescriptor(
    StoreSettingsController.prototype,
    "getSettings",
  ),
);
UseGuards(LegacyAdminGuard)(
  StoreSettingsController.prototype,
  "getSettings",
  Object.getOwnPropertyDescriptor(
    StoreSettingsController.prototype,
    "getSettings",
  ),
);
Put()(
  StoreSettingsController.prototype,
  "updateSettings",
  Object.getOwnPropertyDescriptor(
    StoreSettingsController.prototype,
    "updateSettings",
  ),
);
HttpCode(200)(
  StoreSettingsController.prototype,
  "updateSettings",
  Object.getOwnPropertyDescriptor(
    StoreSettingsController.prototype,
    "updateSettings",
  ),
);
UseGuards(LegacyAdminGuard)(
  StoreSettingsController.prototype,
  "updateSettings",
  Object.getOwnPropertyDescriptor(
    StoreSettingsController.prototype,
    "updateSettings",
  ),
);
Body()(StoreSettingsController.prototype, "updateSettings", 0);

export { StoreSettingsController };
