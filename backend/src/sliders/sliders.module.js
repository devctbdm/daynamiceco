import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { SliderImageInterceptor } from "./slider-image.interceptor.js";
import { SlidersController } from "./sliders.controller.js";
import { SlidersService } from "./sliders.service.js";

class SlidersModule {}

Module({
  controllers: [SlidersController],
  providers: [SlidersService, LegacyAdminGuard, SliderImageInterceptor],
})(SlidersModule);

export default SlidersModule;
