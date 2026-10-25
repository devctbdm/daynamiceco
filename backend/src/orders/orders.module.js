import { Module } from "@nestjs/common";
import { CartAuthGuard, CartSellingGuard } from "../cart/cart-auth.guard.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import LoyaltyModule from "../loyalty/loyalty.module.js";

class OrdersModule {}

Module({
  imports: [LoyaltyModule],
  controllers: [OrdersController],
  providers: [OrdersService, CartAuthGuard, CartSellingGuard, LegacyAdminGuard],
})(OrdersModule);

export default OrdersModule;
