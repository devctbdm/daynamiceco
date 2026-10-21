import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CategoryFilesInterceptor } from "./category-files.interceptor.js";
import { CategoriesService } from "./categories.service.js";

export class CategoriesController {
  constructor(categoriesService) {
    this.categoriesService = categoriesService;
  }

  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { success: true, categories };
  }

  async findById(id) {
    const category = await this.categoriesService.findById(id);
    if (!category) throw categoryNotFound();

    return { success: true, category };
  }

  async create(request, body) {
    return {
      success: true,
      category: await this.categoriesService.create(
        body ?? {},
        request.files,
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async reorder(body) {
    await this.categoriesService.reorder(body?.orders);
    return { success: true, message: "Categories reordered" };
  }

  async update(id, body, request) {
    const category = await this.categoriesService.update(
      id,
      body ?? {},
      request.files,
    );
    if (!category) throw categoryNotFound();
    return { success: true, category };
  }

  async delete(id) {
    if (!(await this.categoriesService.delete(id))) throw categoryNotFound();
    return { success: true, message: "Category deleted successfully" };
  }
}

function categoryNotFound() {
  return new NotFoundException({
    success: false,
    message: "Category not found",
  });
}

Controller("categories")(CategoriesController);
Inject(CategoriesService)(CategoriesController, undefined, 0);

Get()(
  CategoriesController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "findAll"),
);
Get(":id")(
  CategoriesController.prototype,
  "findById",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "findById"),
);
Param("id")(CategoriesController.prototype, "findById", 0);

Post()(
  CategoriesController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "create"),
);
UseGuards(LegacyAdminGuard)(
  CategoriesController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "create"),
);
UseInterceptors(CategoryFilesInterceptor)(
  CategoriesController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "create"),
);
Req()(CategoriesController.prototype, "create", 0);
Body()(CategoriesController.prototype, "create", 1);

Put("reorder")(
  CategoriesController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "reorder"),
);
HttpCode(200)(
  CategoriesController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "reorder"),
);
UseGuards(LegacyAdminGuard)(
  CategoriesController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "reorder"),
);
Body()(CategoriesController.prototype, "reorder", 0);

Put(":id")(
  CategoriesController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "update"),
);
HttpCode(200)(
  CategoriesController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  CategoriesController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "update"),
);
UseInterceptors(CategoryFilesInterceptor)(
  CategoriesController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "update"),
);
Param("id")(CategoriesController.prototype, "update", 0);
Body()(CategoriesController.prototype, "update", 1);
Req()(CategoriesController.prototype, "update", 2);

Delete(":id")(
  CategoriesController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "delete"),
);
HttpCode(200)(
  CategoriesController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "delete"),
);
UseGuards(LegacyAdminGuard)(
  CategoriesController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(CategoriesController.prototype, "delete"),
);
Param("id")(CategoriesController.prototype, "delete", 0);
