import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CategoryFilesInterceptor } from "./category-files.interceptor.js";
import { CategoriesController } from "./categories.controller.js";
import { CategoriesService } from "./categories.service.js";

class CategoriesModule {}

Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, LegacyAdminGuard, CategoryFilesInterceptor],
})(CategoriesModule);

export default CategoriesModule;
