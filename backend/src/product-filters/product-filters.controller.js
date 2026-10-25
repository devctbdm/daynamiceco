import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { ProductFiltersService } from "./product-filters.service.js";

class ProductFiltersController {
  constructor(productFiltersService) {
    this.productFiltersService = productFiltersService;
  }

  async findAll() {
    return {
      success: true,
      settings: await this.productFiltersService.findAll(),
    };
  }

  async upsert(body) {
    return {
      success: true,
      settings: await this.productFiltersService.upsert(body ?? {}),
    };
  }

  async remove(categoryId, brand) {
    await this.productFiltersService.remove(categoryId, brand ?? "");
    return { success: true, message: "Product filter settings reset" };
  }
}

Controller("product-filters")(ProductFiltersController);
Inject(ProductFiltersService)(ProductFiltersController, undefined, 0);

Get()(
  ProductFiltersController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(
    ProductFiltersController.prototype,
    "findAll",
  ),
);

Put()(
  ProductFiltersController.prototype,
  "upsert",
  Object.getOwnPropertyDescriptor(ProductFiltersController.prototype, "upsert"),
);
HttpCode(200)(
  ProductFiltersController.prototype,
  "upsert",
  Object.getOwnPropertyDescriptor(ProductFiltersController.prototype, "upsert"),
);
UseGuards(LegacyAdminGuard)(
  ProductFiltersController.prototype,
  "upsert",
  Object.getOwnPropertyDescriptor(ProductFiltersController.prototype, "upsert"),
);
Body()(ProductFiltersController.prototype, "upsert", 0);

Delete(":categoryId")(
  ProductFiltersController.prototype,
  "remove",
  Object.getOwnPropertyDescriptor(ProductFiltersController.prototype, "remove"),
);
HttpCode(200)(
  ProductFiltersController.prototype,
  "remove",
  Object.getOwnPropertyDescriptor(ProductFiltersController.prototype, "remove"),
);
UseGuards(LegacyAdminGuard)(
  ProductFiltersController.prototype,
  "remove",
  Object.getOwnPropertyDescriptor(ProductFiltersController.prototype, "remove"),
);
Param("categoryId")(ProductFiltersController.prototype, "remove", 0);
Query("brand")(ProductFiltersController.prototype, "remove", 1);

export { ProductFiltersController };
