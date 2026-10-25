import { Module } from "@nestjs/common";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { LoyaltyController } from "./loyalty.controller.js";
import { LoyaltyService } from "./loyalty.service.js";

class LoyaltyModule {}

Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, CartAuthGuard, LegacyAdminGuard],
  exports: [LoyaltyService],
})(LoyaltyModule);

export default LoyaltyModule;
