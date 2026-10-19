import { Module } from "@nestjs/common";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { ProductImagesInterceptor } from "./product-images.interceptor.js";
import { ProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";

class ProductsModule {}

Module({
  controllers: [ProductsController],
  providers: [
    ProductsService,
    LegacyAdminGuard,
    CartAuthGuard,
    ProductImagesInterceptor,
  ],
})(ProductsModule);

export default ProductsModule;
