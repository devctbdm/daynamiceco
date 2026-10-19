import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PermissionGroupsSuperAdminGuard } from "../permission-groups/super-admin.guard.js";
import { StaffController, TeamController } from "./team-members.controller.js";
import { TeamMembersService } from "./team-members.service.js";

class TeamMembersModule {}

Module({
  controllers: [TeamController, StaffController],
  providers: [
    TeamMembersService,
    LegacyAdminGuard,
    PermissionGroupsSuperAdminGuard,
  ],
})(TeamMembersModule);

export default TeamMembersModule;
