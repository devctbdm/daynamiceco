import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Get,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CartAuthGuard, CartSellingGuard } from "./cart-auth.guard.js";
import { CartService } from "./cart.service.js";

class CartController {
  constructor(cartService) {
    this.cartService = cartService;
  }

  async getCart(request) {
    return {
      success: true,
      cart: await this.cartService.getCart(userId(request)),
    };
  }

  async addToCart(request, body) {
    return {
      success: true,
      cart: await this.cartService.addItem(userId(request), body),
    };
  }

  async updateCartItem(request, body) {
    return {
      success: true,
      cart: await this.cartService.updateItem(
        userId(request),
        body?.productId,
        body?.quantity,
      ),
    };
  }

  async removeFromCart(request, productId) {
    return {
      success: true,
      cart: await this.cartService.removeItem(userId(request), productId),
    };
  }

  async clearCart(request) {
    await this.cartService.clearCart(userId(request));
    return { success: true, message: "Cart cleared" };
  }
}

function userId(request) {
  return String(request.user?._id ?? request.user?.id);
}

Controller("cart")(CartController);
UseGuards(CartAuthGuard)(CartController);
Inject(CartService)(CartController, undefined, 0);

Get()(
  CartController.prototype,
  "getCart",
  Object.getOwnPropertyDescriptor(CartController.prototype, "getCart"),
);
Req()(CartController.prototype, "getCart", 0);

Post()(
  CartController.prototype,
  "addToCart",
  Object.getOwnPropertyDescriptor(CartController.prototype, "addToCart"),
);
HttpCode(200)(
  CartController.prototype,
  "addToCart",
  Object.getOwnPropertyDescriptor(CartController.prototype, "addToCart"),
);
UseGuards(CartSellingGuard)(
  CartController.prototype,
  "addToCart",
  Object.getOwnPropertyDescriptor(CartController.prototype, "addToCart"),
);
Req()(CartController.prototype, "addToCart", 0);
Body()(CartController.prototype, "addToCart", 1);

Put()(
  CartController.prototype,
  "updateCartItem",
  Object.getOwnPropertyDescriptor(CartController.prototype, "updateCartItem"),
);
Req()(CartController.prototype, "updateCartItem", 0);
Body()(CartController.prototype, "updateCartItem", 1);

Delete("clear")(
  CartController.prototype,
  "clearCart",
  Object.getOwnPropertyDescriptor(CartController.prototype, "clearCart"),
);
Req()(CartController.prototype, "clearCart", 0);

Delete(":productId")(
  CartController.prototype,
  "removeFromCart",
  Object.getOwnPropertyDescriptor(CartController.prototype, "removeFromCart"),
);
Req()(CartController.prototype, "removeFromCart", 0);
Param("productId")(CartController.prototype, "removeFromCart", 1);

export { CartController };
