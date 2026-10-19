import { Module } from "@nestjs/common";
import { PermissionGroupsController } from "./permission-groups.controller.js";
import { PermissionGroupsService } from "./permission-groups.service.js";
import { PermissionGroupsSuperAdminGuard } from "./super-admin.guard.js";

class PermissionGroupsModule {}

Module({
  controllers: [PermissionGroupsController],
  providers: [PermissionGroupsService, PermissionGroupsSuperAdminGuard],
})(PermissionGroupsModule);

export default PermissionGroupsModule;
