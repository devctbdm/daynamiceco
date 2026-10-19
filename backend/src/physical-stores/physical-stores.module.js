import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PhysicalStoreBannerInterceptor } from "./physical-store-banner.interceptor.js";
import { PhysicalStoresController } from "./physical-stores.controller.js";
import { PhysicalStoresService } from "./physical-stores.service.js";

class PhysicalStoresModule {}

Module({
  controllers: [PhysicalStoresController],
  providers: [
    PhysicalStoresService,
    LegacyAdminGuard,
    PhysicalStoreBannerInterceptor,
  ],
})(PhysicalStoresModule);

export default PhysicalStoresModule;
