import {
  Body,
  Controller,
  Delete,
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
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { ServiceFindersService } from "./service-finders.service.js";

class ServiceFindersController {
  constructor(serviceFindersService) {
    this.serviceFindersService = serviceFindersService;
  }

  async findAll(active) {
    return {
      success: true,
      items: await this.serviceFindersService.findAll(active === "true"),
    };
  }

  // Keep the static "/setting" route declared before "/:id" — Nest registers
  // routes in method-declaration order, so otherwise it would be shadowed.
  async getSetting() {
    return {
      success: true,
      setting: await this.serviceFindersService.getSetting(),
    };
  }

  async updateSetting(body) {
    return {
      success: true,
      setting: await this.serviceFindersService.updateSetting(body),
    };
  }

  async findById(id) {
    const item = await this.serviceFindersService.findById(id);
    if (!item) {
      throw notFound();
    }
    return { success: true, item };
  }

  async create(request, body) {
    return {
      success: true,
      item: await this.serviceFindersService.create(
        body,
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async reorder(body) {
    await this.serviceFindersService.reorder(body?.orders);
    return { success: true, message: "Service finder cards reordered" };
  }

  async update(id, body) {
    const item = await this.serviceFindersService.update(id, body);
    if (!item) {
      throw notFound();
    }
    return { success: true, item };
  }

  async delete(id) {
    if (!(await this.serviceFindersService.delete(id))) {
      throw notFound();
    }
    return { success: true, message: "Service finder card deleted" };
  }
}

function notFound() {
  return new NotFoundException({
    success: false,
    message: "Service finder card not found",
  });
}

Controller("service-finders")(ServiceFindersController);
Inject(ServiceFindersService)(ServiceFindersController, undefined, 0);

Get()(
  ServiceFindersController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "findAll",
  ),
);
Query("active")(ServiceFindersController.prototype, "findAll", 0);

Get("setting")(
  ServiceFindersController.prototype,
  "getSetting",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "getSetting",
  ),
);

Put("setting")(
  ServiceFindersController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "updateSetting",
  ),
);
HttpCode(200)(
  ServiceFindersController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "updateSetting",
  ),
);
UseGuards(LegacyAdminGuard)(
  ServiceFindersController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "updateSetting",
  ),
);
Body()(ServiceFindersController.prototype, "updateSetting", 0);

Get(":id")(
  ServiceFindersController.prototype,
  "findById",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "findById",
  ),
);
Param("id")(ServiceFindersController.prototype, "findById", 0);

Post()(
  ServiceFindersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "create"),
);
UseGuards(LegacyAdminGuard)(
  ServiceFindersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "create"),
);
Req()(ServiceFindersController.prototype, "create", 0);
Body()(ServiceFindersController.prototype, "create", 1);

Put("reorder")(
  ServiceFindersController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "reorder",
  ),
);
HttpCode(200)(
  ServiceFindersController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "reorder",
  ),
);
UseGuards(LegacyAdminGuard)(
  ServiceFindersController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    ServiceFindersController.prototype,
    "reorder",
  ),
);
Body()(ServiceFindersController.prototype, "reorder", 0);

Put(":id")(
  ServiceFindersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "update"),
);
HttpCode(200)(
  ServiceFindersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  ServiceFindersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "update"),
);
Param("id")(ServiceFindersController.prototype, "update", 0);
Body()(ServiceFindersController.prototype, "update", 1);

Delete(":id")(
  ServiceFindersController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "delete"),
);
HttpCode(200)(
  ServiceFindersController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "delete"),
);
UseGuards(LegacyAdminGuard)(
  ServiceFindersController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(ServiceFindersController.prototype, "delete"),
);
Param("id")(ServiceFindersController.prototype, "delete", 0);

export { ServiceFindersController };
