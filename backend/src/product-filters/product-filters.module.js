import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { ProductFiltersController } from "./product-filters.controller.js";
import { ProductFiltersService } from "./product-filters.service.js";

class ProductFiltersModule {}

Module({
  controllers: [ProductFiltersController],
  providers: [ProductFiltersService, LegacyAdminGuard],
})(ProductFiltersModule);

export default ProductFiltersModule;
