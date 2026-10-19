import { Module } from "@nestjs/common";
import { HolidayAdminGuard } from "./holiday-admin.guard.js";
import { HolidayController } from "./holiday.controller.js";
import { HolidayService } from "./holiday.service.js";

class HolidayModule {}

Module({
  controllers: [HolidayController],
  providers: [HolidayService, HolidayAdminGuard],
})(HolidayModule);

export default HolidayModule;
