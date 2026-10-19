import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PopupOfferImageInterceptor } from "./popup-offer-image.interceptor.js";
import { PopupOffersController } from "./popup-offers.controller.js";
import { PopupOffersService } from "./popup-offers.service.js";

class PopupOffersModule {}

Module({
  controllers: [PopupOffersController],
  providers: [PopupOffersService, LegacyAdminGuard, PopupOfferImageInterceptor],
})(PopupOffersModule);

export default PopupOffersModule;
