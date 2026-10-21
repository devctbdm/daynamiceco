import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { ServiceFindersController } from "./service-finders.controller.js";
import { ServiceFindersService } from "./service-finders.service.js";

class ServiceFindersModule {}

Module({
  controllers: [ServiceFindersController],
  providers: [ServiceFindersService, LegacyAdminGuard],
})(ServiceFindersModule);

export default ServiceFindersModule;
