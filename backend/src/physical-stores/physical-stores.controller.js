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
  UseInterceptors,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PhysicalStoreBannerInterceptor } from "./physical-store-banner.interceptor.js";
import { PhysicalStoresService } from "./physical-stores.service.js";

class PhysicalStoresController {
  constructor(physicalStoresService) {
    this.physicalStoresService = physicalStoresService;
  }

  async findAll(active) {
    return {
      success: true,
      stores: await this.physicalStoresService.findAll(active === "true"),
    };
  }

  async getSetting() {
    return {
      success: true,
      setting: await this.physicalStoresService.getSetting(),
    };
  }

  async findById(id) {
    const store = await this.physicalStoresService.findById(id);
    if (!store) {
      throw new NotFoundException({
        success: false,
        message: "Store not found",
      });
    }
    return { success: true, store };
  }

  async create(request, body) {
    return {
      success: true,
      store: await this.physicalStoresService.create(
        body ?? {},
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async update(id, body) {
    const store = await this.physicalStoresService.update(id, body ?? {});
    if (!store) {
      throw new NotFoundException({
        success: false,
        message: "Store not found",
      });
    }
    return { success: true, store };
  }

  async delete(id) {
    if (!(await this.physicalStoresService.delete(id))) {
      throw new NotFoundException({
        success: false,
        message: "Store not found",
      });
    }
    return { success: true, message: "Store deleted" };
  }

  async reorder(body) {
    await this.physicalStoresService.reorder(body?.orders);
    return { success: true, message: "Stores reordered" };
  }

  async updateSetting(request, body) {
    return {
      success: true,
      setting: await this.physicalStoresService.updateSetting(
        body ?? {},
        request.file,
      ),
    };
  }
}

Controller("physical-stores")(PhysicalStoresController);
Inject(PhysicalStoresService)(PhysicalStoresController, undefined, 0);

Get()(
  PhysicalStoresController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "findAll",
  ),
);
Query("active")(PhysicalStoresController.prototype, "findAll", 0);

Get("setting")(
  PhysicalStoresController.prototype,
  "getSetting",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "getSetting",
  ),
);

Get(":id")(
  PhysicalStoresController.prototype,
  "findById",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "findById",
  ),
);
Param("id")(PhysicalStoresController.prototype, "findById", 0);

Post()(
  PhysicalStoresController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "create"),
);
UseGuards(LegacyAdminGuard)(
  PhysicalStoresController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "create"),
);
Req()(PhysicalStoresController.prototype, "create", 0);
Body()(PhysicalStoresController.prototype, "create", 1);

Put("reorder")(
  PhysicalStoresController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "reorder",
  ),
);
HttpCode(200)(
  PhysicalStoresController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "reorder",
  ),
);
UseGuards(LegacyAdminGuard)(
  PhysicalStoresController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "reorder",
  ),
);
Body()(PhysicalStoresController.prototype, "reorder", 0);

Put("setting")(
  PhysicalStoresController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "updateSetting",
  ),
);
HttpCode(200)(
  PhysicalStoresController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "updateSetting",
  ),
);
UseGuards(LegacyAdminGuard)(
  PhysicalStoresController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "updateSetting",
  ),
);
UseInterceptors(PhysicalStoreBannerInterceptor)(
  PhysicalStoresController.prototype,
  "updateSetting",
  Object.getOwnPropertyDescriptor(
    PhysicalStoresController.prototype,
    "updateSetting",
  ),
);
Req()(PhysicalStoresController.prototype, "updateSetting", 0);
Body()(PhysicalStoresController.prototype, "updateSetting", 1);

Put(":id")(
  PhysicalStoresController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "update"),
);
HttpCode(200)(
  PhysicalStoresController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  PhysicalStoresController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "update"),
);
Param("id")(PhysicalStoresController.prototype, "update", 0);
Body()(PhysicalStoresController.prototype, "update", 1);

Delete(":id")(
  PhysicalStoresController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "delete"),
);
HttpCode(200)(
  PhysicalStoresController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "delete"),
);
UseGuards(LegacyAdminGuard)(
  PhysicalStoresController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(PhysicalStoresController.prototype, "delete"),
);
Param("id")(PhysicalStoresController.prototype, "delete", 0);

export { PhysicalStoresController };
