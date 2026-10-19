import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

class NotificationsModule {}

Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, LegacyAdminGuard],
})(NotificationsModule);

export default NotificationsModule;
