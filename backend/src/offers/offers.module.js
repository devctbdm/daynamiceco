import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { OfferImageInterceptor } from "./offer-image.interceptor.js";
import { OffersController } from "./offers.controller.js";
import { OffersService } from "./offers.service.js";

class OffersModule {}

Module({
  controllers: [OffersController],
  providers: [OffersService, LegacyAdminGuard, OfferImageInterceptor],
})(OffersModule);

export default OffersModule;
