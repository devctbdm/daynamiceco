import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { NotificationsService } from "./notifications.service.js";

class NotificationsController {
  constructor(notificationsService) {
    this.notificationsService = notificationsService;
  }

  getNotifications(query) {
    return this.notificationsService.getNotifications(query);
  }

  getUnreadCount() {
    return this.notificationsService.getUnreadCount();
  }

  markRead(id) {
    return this.notificationsService.markRead(id);
  }

  markAllRead() {
    return this.notificationsService.markAllRead();
  }
}

Controller("notifications")(NotificationsController);
UseGuards(LegacyAdminGuard)(NotificationsController);
Inject(NotificationsService)(NotificationsController, undefined, 0);

Get()(
  NotificationsController.prototype,
  "getNotifications",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "getNotifications",
  ),
);
Query()(NotificationsController.prototype, "getNotifications", 0);

Get("unread-count")(
  NotificationsController.prototype,
  "getUnreadCount",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "getUnreadCount",
  ),
);

Patch(":id/read")(
  NotificationsController.prototype,
  "markRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markRead",
  ),
);
Param("id")(NotificationsController.prototype, "markRead", 0);

Post("read-all")(
  NotificationsController.prototype,
  "markAllRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markAllRead",
  ),
);
HttpCode(200)(
  NotificationsController.prototype,
  "markAllRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markAllRead",
  ),
);

export { NotificationsController };
