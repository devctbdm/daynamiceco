import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  MaintenanceService,
  MaintenanceSuperAdminGuard,
} from "./maintenance.service.js";

class MaintenanceController {
  constructor(maintenanceService) {
    this.maintenanceService = maintenanceService;
  }

  async getStatus() {
    return {
      success: true,
      maintenance: await this.maintenanceService.getSetting(),
    };
  }

  async updateMaintenance(body) {
    return {
      success: true,
      maintenance: await this.maintenanceService.updateSetting(body ?? {}),
    };
  }
}

Controller("maintenance")(MaintenanceController);
Inject(MaintenanceService)(MaintenanceController, undefined, 0);

Get("status")(
  MaintenanceController.prototype,
  "getStatus",
  Object.getOwnPropertyDescriptor(MaintenanceController.prototype, "getStatus"),
);

Put()(
  MaintenanceController.prototype,
  "updateMaintenance",
  Object.getOwnPropertyDescriptor(
    MaintenanceController.prototype,
    "updateMaintenance",
  ),
);
HttpCode(200)(
  MaintenanceController.prototype,
  "updateMaintenance",
  Object.getOwnPropertyDescriptor(
    MaintenanceController.prototype,
    "updateMaintenance",
  ),
);
UseGuards(MaintenanceSuperAdminGuard)(
  MaintenanceController.prototype,
  "updateMaintenance",
  Object.getOwnPropertyDescriptor(
    MaintenanceController.prototype,
    "updateMaintenance",
  ),
);
Body()(MaintenanceController.prototype, "updateMaintenance", 0);

export { MaintenanceController };
