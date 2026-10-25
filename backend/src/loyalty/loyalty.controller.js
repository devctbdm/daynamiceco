import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { LoyaltyService } from "./loyalty.service.js";

class LoyaltyController {
  constructor(loyaltyService) {
    this.loyaltyService = loyaltyService;
  }

  async rules() {
    const settings = await this.loyaltyService.getSettings();
    return {
      success: true,
      rules: {
        enabled: settings.enabled,
        pointsPerHundred: settings.pointsPerHundred,
        pointValue: settings.pointValue,
      },
    };
  }

  async estimateProduct(id, query) {
    return {
      success: true,
      ...(await this.loyaltyService.estimateProduct(id, query?.variantId || "")),
    };
  }

  async quote(request, body) {
    return {
      success: true,
      quote: await this.loyaltyService.quote(
        String(request.user._id ?? request.user.id),
        body?.items,
        body?.couponCode,
      ),
    };
  }

  async mine(request, query) {
    return {
      success: true,
      ...(await this.loyaltyService.getCustomerSummary(
        String(request.user._id ?? request.user.id),
        query,
      )),
    };
  }

  async settings(request) {
    await this.loyaltyService.assertPermission(request.user, "view");
    return {
      success: true,
      settings: await this.loyaltyService.getSettings(),
    };
  }

  async saveSettings(request, body) {
    return {
      success: true,
      settings: await this.loyaltyService.saveSettings(body ?? {}, request.user),
    };
  }

  async summary(request) {
    return {
      success: true,
      summary: await this.loyaltyService.getAdminSummary(request.user),
    };
  }

  async customers(request, query) {
    return {
      success: true,
      ...(await this.loyaltyService.listCustomers(request.user, query)),
    };
  }

  async customer(id, request, query) {
    return {
      success: true,
      ...(await this.loyaltyService.getAdminCustomer(id, request.user, query)),
    };
  }

  async adjust(id, request, body) {
    return {
      success: true,
      ...(await this.loyaltyService.adjustPoints(id, body ?? {}, request.user)),
    };
  }

  async expire(request) {
    await this.loyaltyService.assertPermission(request.user, "manage");
    return { success: true, ...(await this.loyaltyService.expirePoints()) };
  }
}

Controller("loyalty")(LoyaltyController);
Inject(LoyaltyService)(LoyaltyController, undefined, 0);

function route(method, decorator, guards, params = []) {
  const descriptor = Object.getOwnPropertyDescriptor(
    LoyaltyController.prototype,
    method,
  );
  decorator(LoyaltyController.prototype, method, descriptor);
  if (guards.length) {
    UseGuards(...guards)(LoyaltyController.prototype, method, descriptor);
  }
  params.forEach(([decoratorFactory, index]) =>
    decoratorFactory(LoyaltyController.prototype, method, index),
  );
}

route("rules", Get("rules"), []);
route("estimateProduct", Get("products/:id/estimate"), [], [
  [Param("id"), 0],
  [Query(), 1],
]);
route("quote", Post("quote"), [CartAuthGuard], [
  [Req(), 0],
  [Body(), 1],
]);
route("mine", Get("me"), [CartAuthGuard], [
  [Req(), 0],
  [Query(), 1],
]);
route("settings", Get("admin/settings"), [LegacyAdminGuard], [[Req(), 0]]);
route("saveSettings", Put("admin/settings"), [LegacyAdminGuard], [
  [Req(), 0],
  [Body(), 1],
]);
route("summary", Get("admin/summary"), [LegacyAdminGuard], [[Req(), 0]]);
route("customers", Get("admin/customers"), [LegacyAdminGuard], [
  [Req(), 0],
  [Query(), 1],
]);
route("customer", Get("admin/customers/:id"), [LegacyAdminGuard], [
  [Param("id"), 0],
  [Req(), 1],
  [Query(), 2],
]);
route("adjust", Post("admin/customers/:id/adjustments"), [LegacyAdminGuard], [
  [Param("id"), 0],
  [Req(), 1],
  [Body(), 2],
]);
route("expire", Post("admin/expire"), [LegacyAdminGuard], [[Req(), 0]]);

export { LoyaltyController };
