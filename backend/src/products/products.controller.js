import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { getNextProductCode } from "../utils/productCode.js";
import { generateUniqueSku } from "../utils/sku.js";
import { ProductImagesInterceptor } from "./product-images.interceptor.js";
import { ProductsService } from "./products.service.js";

class ProductsController {
  constructor(productsService) {
    this.productsService = productsService;
  }

  async findAll(query) {
    return this.productsService.findAll(query);
  }

  async findByCategory(category) {
    return {
      success: true,
      products: await this.productsService.findByCategory(category),
    };
  }

  async findBySlug(slug) {
    return this.productsService.findBySlug(slug);
  }

  async findPcParts(query) {
    return this.productsService.findPcParts(query);
  }

  async findById(id) {
    return this.productsService.findById(id);
  }

  async generateCode() {
    return { success: true, productCode: await getNextProductCode() };
  }

  async generateSku(body) {
    const { sku, suffix } = await generateUniqueSku(body?.name, body?.category);
    return { success: true, sku, suffix };
  }

  async create(request, body) {
    return {
      success: true,
      product: await this.productsService.create(
        body ?? {},
        request.files,
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async update(id, body, request) {
    return {
      success: true,
      product: await this.productsService.update(id, body ?? {}, request.files),
    };
  }

  async addRating(id, body, request) {
    return {
      success: true,
      product: await this.productsService.addRating(
        id,
        request.user?._id ?? request.user?.id,
        body?.rating,
        body?.comment,
      ),
    };
  }

  async delete(id) {
    await this.productsService.delete(id);
    return { success: true, message: "Product deleted successfully" };
  }
}

Controller("products")(ProductsController);
Inject(ProductsService)(ProductsController, undefined, 0);

Get()(
  ProductsController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "findAll"),
);
Query()(ProductsController.prototype, "findAll", 0);

Get("category/:category")(
  ProductsController.prototype,
  "findByCategory",
  Object.getOwnPropertyDescriptor(
    ProductsController.prototype,
    "findByCategory",
  ),
);
Param("category")(ProductsController.prototype, "findByCategory", 0);

Get("slug/:slug")(
  ProductsController.prototype,
  "findBySlug",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "findBySlug"),
);
Param("slug")(ProductsController.prototype, "findBySlug", 0);

Get("pc-parts")(
  ProductsController.prototype,
  "findPcParts",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "findPcParts"),
);
Query()(ProductsController.prototype, "findPcParts", 0);

Get(":id")(
  ProductsController.prototype,
  "findById",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "findById"),
);
Param("id")(ProductsController.prototype, "findById", 0);

Post("generate-code")(
  ProductsController.prototype,
  "generateCode",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "generateCode"),
);
HttpCode(200)(
  ProductsController.prototype,
  "generateCode",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "generateCode"),
);
UseGuards(LegacyAdminGuard)(
  ProductsController.prototype,
  "generateCode",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "generateCode"),
);

Post("generate-sku")(
  ProductsController.prototype,
  "generateSku",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "generateSku"),
);
HttpCode(200)(
  ProductsController.prototype,
  "generateSku",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "generateSku"),
);
UseGuards(LegacyAdminGuard)(
  ProductsController.prototype,
  "generateSku",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "generateSku"),
);
Body()(ProductsController.prototype, "generateSku", 0);

Post()(
  ProductsController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "create"),
);
UseGuards(LegacyAdminGuard)(
  ProductsController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "create"),
);
UseInterceptors(ProductImagesInterceptor)(
  ProductsController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "create"),
);
Req()(ProductsController.prototype, "create", 0);
Body()(ProductsController.prototype, "create", 1);

Put(":id")(
  ProductsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "update"),
);
HttpCode(200)(
  ProductsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  ProductsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "update"),
);
UseInterceptors(ProductImagesInterceptor)(
  ProductsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "update"),
);
Param("id")(ProductsController.prototype, "update", 0);
Body()(ProductsController.prototype, "update", 1);
Req()(ProductsController.prototype, "update", 2);

Post(":id/ratings")(
  ProductsController.prototype,
  "addRating",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "addRating"),
);
HttpCode(200)(
  ProductsController.prototype,
  "addRating",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "addRating"),
);
UseGuards(CartAuthGuard)(
  ProductsController.prototype,
  "addRating",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "addRating"),
);
Param("id")(ProductsController.prototype, "addRating", 0);
Body()(ProductsController.prototype, "addRating", 1);
Req()(ProductsController.prototype, "addRating", 2);

Delete(":id")(
  ProductsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "delete"),
);
HttpCode(200)(
  ProductsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "delete"),
);
UseGuards(LegacyAdminGuard)(
  ProductsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(ProductsController.prototype, "delete"),
);
Param("id")(ProductsController.prototype, "delete", 0);

export { ProductsController };
