import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { HomeSliderTextsController } from "./home-slider-texts.controller.js";
import { HomeSliderTextsService } from "./home-slider-texts.service.js";

class HomeSliderTextsModule {}

Module({
  controllers: [HomeSliderTextsController],
  providers: [HomeSliderTextsService, LegacyAdminGuard],
})(HomeSliderTextsModule);

export default HomeSliderTextsModule;
