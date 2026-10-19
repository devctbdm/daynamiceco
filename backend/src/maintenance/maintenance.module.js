import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { MaintenanceController } from "./maintenance.controller.js";
import {
  MaintenanceService,
  MaintenanceSuperAdminGuard,
} from "./maintenance.service.js";

class MaintenanceModule {}

Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService, LegacyAdminGuard, MaintenanceSuperAdminGuard],
})(MaintenanceModule);

export default MaintenanceModule;
