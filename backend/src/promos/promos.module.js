import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PromosController } from "./promos.controller.js";
import { PromosService } from "./promos.service.js";

class PromosModule {}

Module({
  controllers: [PromosController],
  providers: [PromosService, LegacyAdminGuard],
})(PromosModule);

export default PromosModule;
