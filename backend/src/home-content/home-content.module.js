import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { HomeContentController } from "./home-content.controller.js";
import { HomeContentService } from "./home-content.service.js";

class HomeContentModule {}

Module({
  controllers: [HomeContentController],
  providers: [HomeContentService, LegacyAdminGuard],
})(HomeContentModule);

export default HomeContentModule;
