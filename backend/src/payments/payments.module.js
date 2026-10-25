import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CartAuthGuard, CartSellingGuard } from "../cart/cart-auth.guard.js";
import { PaymentsController } from "./payments.controller.js";

class PaymentsModule {}

Module({
  controllers: [PaymentsController],
  providers: [CartAuthGuard, CartSellingGuard, LegacyAdminGuard],
})(PaymentsModule);

export default PaymentsModule;
