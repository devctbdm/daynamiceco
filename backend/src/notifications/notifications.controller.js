import {
  Controller,
  Delete,
  Get,
  ForbiddenException,
  HttpCode,
  Inject,
  Patch,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
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

  getCustomerNotifications(request, query) {
    assertCustomer(request);
    return this.notificationsService.getCustomerNotifications(
      request.user._id ?? request.user.id,
      query,
    );
  }

  markCustomerRead(request, id) {
    assertCustomer(request);
    return this.notificationsService.markCustomerRead(
      id,
      request.user._id ?? request.user.id,
    );
  }

  markAllCustomerRead(request) {
    assertCustomer(request);
    return this.notificationsService.markAllCustomerRead(
      request.user._id ?? request.user.id,
    );
  }

  getCampaigns(query) {
    return this.notificationsService.getCampaigns(query);
  }

  createCampaign(body) {
    return this.notificationsService.createCampaign(body);
  }

  updateCampaign(id, body) {
    return this.notificationsService.updateCampaign(id, body);
  }

  deleteCampaign(id) {
    return this.notificationsService.deleteCampaign(id);
  }
}

Controller("notifications")(NotificationsController);
Inject(NotificationsService)(NotificationsController, undefined, 0);

for (const method of [
  "getNotifications",
  "getUnreadCount",
  "markRead",
  "markAllRead",
  "getCampaigns",
  "createCampaign",
  "updateCampaign",
  "deleteCampaign",
]) {
  UseGuards(LegacyAdminGuard)(
    NotificationsController.prototype,
    method,
    Object.getOwnPropertyDescriptor(NotificationsController.prototype, method),
  );
}

Get("campaigns")(
  NotificationsController.prototype,
  "getCampaigns",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "getCampaigns",
  ),
);
Query()(NotificationsController.prototype, "getCampaigns", 0);

Post("campaigns")(
  NotificationsController.prototype,
  "createCampaign",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "createCampaign",
  ),
);
Body()(NotificationsController.prototype, "createCampaign", 0);

Put("campaigns/:id")(
  NotificationsController.prototype,
  "updateCampaign",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "updateCampaign",
  ),
);
Param("id")(NotificationsController.prototype, "updateCampaign", 0);
Body()(NotificationsController.prototype, "updateCampaign", 1);

Delete("campaigns/:id")(
  NotificationsController.prototype,
  "deleteCampaign",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "deleteCampaign",
  ),
);
Param("id")(NotificationsController.prototype, "deleteCampaign", 0);

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

Get("customer")(
  NotificationsController.prototype,
  "getCustomerNotifications",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "getCustomerNotifications",
  ),
);
UseGuards(CartAuthGuard)(
  NotificationsController.prototype,
  "getCustomerNotifications",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "getCustomerNotifications",
  ),
);
Req()(NotificationsController.prototype, "getCustomerNotifications", 0);
Query()(NotificationsController.prototype, "getCustomerNotifications", 1);

Patch("customer/:id/read")(
  NotificationsController.prototype,
  "markCustomerRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markCustomerRead",
  ),
);
UseGuards(CartAuthGuard)(
  NotificationsController.prototype,
  "markCustomerRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markCustomerRead",
  ),
);
Req()(NotificationsController.prototype, "markCustomerRead", 0);
Param("id")(NotificationsController.prototype, "markCustomerRead", 1);

Post("customer/read-all")(
  NotificationsController.prototype,
  "markAllCustomerRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markAllCustomerRead",
  ),
);
UseGuards(CartAuthGuard)(
  NotificationsController.prototype,
  "markAllCustomerRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markAllCustomerRead",
  ),
);
Req()(NotificationsController.prototype, "markAllCustomerRead", 0);
HttpCode(200)(
  NotificationsController.prototype,
  "markAllCustomerRead",
  Object.getOwnPropertyDescriptor(
    NotificationsController.prototype,
    "markAllCustomerRead",
  ),
);

function assertCustomer(request) {
  if (request.isTeam || request.user?.role !== "customer") {
    throw new ForbiddenException({
      success: false,
      message: "Customer access required",
    });
  }
}

export { NotificationsController };
