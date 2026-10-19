import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CartAuthGuard, CartSellingGuard } from "../cart/cart-auth.guard.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { OrdersService } from "./orders.service.js";

class OrdersController {
  constructor(ordersService) {
    this.ordersService = ordersService;
  }

  async create(request, body) {
    return {
      success: true,
      order: await this.ordersService.create(request.user, body ?? {}),
    };
  }

  async findMine(request) {
    return {
      success: true,
      orders: await this.ordersService.findMine(request.user._id),
    };
  }

  async findOne(id, request) {
    const order = await this.ordersService.findById(id);
    if (!order) throw orderNotFound();
    const ownerId = String(order.user?._id ?? order.user);
    const requesterId = String(request.user?._id ?? request.user?.id);
    if (
      ownerId !== requesterId &&
      !["admin", "super_admin"].includes(request.user?.role)
    ) {
      throw new ForbiddenException({
        success: false,
        message: "Not authorized",
      });
    }
    return { success: true, order };
  }

  async findAll(query) {
    return {
      success: true,
      ...(await this.ordersService.findAll(query)),
    };
  }

  async stats() {
    return { success: true, stats: await this.ordersService.getStats() };
  }

  async updateStatus(id, body) {
    const order = await this.ordersService.updateStatus(id, body?.status);
    if (!order) throw orderNotFound();
    return { success: true, order };
  }

  async updatePaymentStatus(id, body) {
    const order = await this.ordersService.updatePaymentStatus(
      id,
      body?.status,
    );
    if (!order) throw orderNotFound();
    return { success: true, order };
  }

  async updateAdvance(id, body) {
    const order = await this.ordersService.updateAdvance(id, body ?? {});
    if (!order) throw orderNotFound();
    return { success: true, order };
  }

  async adminCreate(request, body) {
    const result = await this.ordersService.createForCustomer(
      request.user,
      body ?? {},
    );
    return { success: true, ...result };
  }
}

function orderNotFound() {
  return new NotFoundException({ success: false, message: "Order not found" });
}

Controller("orders")(OrdersController);
Inject(OrdersService)(OrdersController, undefined, 0);

Post()(
  OrdersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "create"),
);
UseGuards(CartAuthGuard, CartSellingGuard)(
  OrdersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "create"),
);
Req()(OrdersController.prototype, "create", 0);
Body()(OrdersController.prototype, "create", 1);

Get("my-orders")(
  OrdersController.prototype,
  "findMine",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "findMine"),
);
UseGuards(CartAuthGuard)(
  OrdersController.prototype,
  "findMine",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "findMine"),
);
Req()(OrdersController.prototype, "findMine", 0);

Get("stats")(
  OrdersController.prototype,
  "stats",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "stats"),
);
UseGuards(LegacyAdminGuard)(
  OrdersController.prototype,
  "stats",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "stats"),
);

Post("admin-create")(
  OrdersController.prototype,
  "adminCreate",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "adminCreate"),
);
UseGuards(LegacyAdminGuard)(
  OrdersController.prototype,
  "adminCreate",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "adminCreate"),
);
Req()(OrdersController.prototype, "adminCreate", 0);
Body()(OrdersController.prototype, "adminCreate", 1);

Get()(
  OrdersController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "findAll"),
);
UseGuards(LegacyAdminGuard)(
  OrdersController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "findAll"),
);
Query()(OrdersController.prototype, "findAll", 0);

Get(":id")(
  OrdersController.prototype,
  "findOne",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "findOne"),
);
UseGuards(CartAuthGuard)(
  OrdersController.prototype,
  "findOne",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "findOne"),
);
Param("id")(OrdersController.prototype, "findOne", 0);
Req()(OrdersController.prototype, "findOne", 1);

Put(":id/status")(
  OrdersController.prototype,
  "updateStatus",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "updateStatus"),
);
UseGuards(LegacyAdminGuard)(
  OrdersController.prototype,
  "updateStatus",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "updateStatus"),
);
Param("id")(OrdersController.prototype, "updateStatus", 0);
Body()(OrdersController.prototype, "updateStatus", 1);

Put(":id/payment-status")(
  OrdersController.prototype,
  "updatePaymentStatus",
  Object.getOwnPropertyDescriptor(
    OrdersController.prototype,
    "updatePaymentStatus",
  ),
);
UseGuards(LegacyAdminGuard)(
  OrdersController.prototype,
  "updatePaymentStatus",
  Object.getOwnPropertyDescriptor(
    OrdersController.prototype,
    "updatePaymentStatus",
  ),
);
Param("id")(OrdersController.prototype, "updatePaymentStatus", 0);
Body()(OrdersController.prototype, "updatePaymentStatus", 1);

Put(":id/advance")(
  OrdersController.prototype,
  "updateAdvance",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "updateAdvance"),
);
UseGuards(LegacyAdminGuard)(
  OrdersController.prototype,
  "updateAdvance",
  Object.getOwnPropertyDescriptor(OrdersController.prototype, "updateAdvance"),
);
Param("id")(OrdersController.prototype, "updateAdvance", 0);
Body()(OrdersController.prototype, "updateAdvance", 1);

export { OrdersController };
