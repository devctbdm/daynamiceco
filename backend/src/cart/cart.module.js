import { Module } from "@nestjs/common";
import { CartAuthGuard, CartSellingGuard } from "./cart-auth.guard.js";
import { CartController } from "./cart.controller.js";
import { CartService } from "./cart.service.js";

class CartModule {}

Module({
  controllers: [CartController],
  providers: [CartService, CartAuthGuard, CartSellingGuard],
})(CartModule);

export default CartModule;
