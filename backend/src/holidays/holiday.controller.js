import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Put,
  UseGuards,
} from "@nestjs/common";
import { HolidayAdminGuard } from "./holiday-admin.guard.js";
import { HolidayService } from "./holiday.service.js";

class HolidayController {
  constructor(holidayService) {
    this.holidayService = holidayService;
  }

  async getConfig() {
    return { success: true, config: await this.holidayService.getConfig() };
  }

  async updateConfig(body) {
    return {
      success: true,
      config: await this.holidayService.updateConfig(body ?? {}),
    };
  }
}

Controller("holiday")(HolidayController);
Inject(HolidayService)(HolidayController, undefined, 0);

Get()(
  HolidayController.prototype,
  "getConfig",
  Object.getOwnPropertyDescriptor(HolidayController.prototype, "getConfig"),
);

Put()(
  HolidayController.prototype,
  "updateConfig",
  Object.getOwnPropertyDescriptor(HolidayController.prototype, "updateConfig"),
);
HttpCode(200)(
  HolidayController.prototype,
  "updateConfig",
  Object.getOwnPropertyDescriptor(HolidayController.prototype, "updateConfig"),
);
UseGuards(HolidayAdminGuard)(
  HolidayController.prototype,
  "updateConfig",
  Object.getOwnPropertyDescriptor(HolidayController.prototype, "updateConfig"),
);
Body()(HolidayController.prototype, "updateConfig", 0);

export { HolidayController };
