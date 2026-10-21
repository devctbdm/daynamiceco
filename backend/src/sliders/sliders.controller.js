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
import { SliderImageInterceptor } from "./slider-image.interceptor.js";
import { SlidersService } from "./sliders.service.js";

class SlidersController {
  constructor(slidersService) {
    this.slidersService = slidersService;
  }

  getAll(query) {
    return this.slidersService.getAll(query.active);
  }

  async getById(id) {
    const slider = await this.slidersService.getById(id);
    if (!slider) throw sliderNotFound();
    return { success: true, slider };
  }

  async create(request, body) {
    return {
      success: true,
      slider: await this.slidersService.create(
        body ?? {},
        request.file,
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async reorder(body) {
    await this.slidersService.reorder(body?.orders);
    return { success: true, message: "Slides reordered" };
  }

  async update(id, request, body) {
    const slider = await this.slidersService.update(
      id,
      body ?? {},
      request.file,
    );
    if (!slider) throw sliderNotFound();
    return { success: true, slider };
  }

  async delete(id) {
    if (!(await this.slidersService.delete(id))) throw sliderNotFound();
    return { success: true, message: "Slide deleted" };
  }

  async updateSetting(body) {
    return {
      success: true,
      setting: await this.slidersService.updateSetting(body ?? {}),
    };
  }
}

function sliderNotFound() {
  return new NotFoundException({ success: false, message: "Slide not found" });
}

Controller("sliders")(SlidersController);
Inject(SlidersService)(SlidersController, undefined, 0);

const descriptor = (method) =>
  Object.getOwnPropertyDescriptor(SlidersController.prototype, method);

Get()(SlidersController.prototype, "getAll", descriptor("getAll"));
Query()(SlidersController.prototype, "getAll", 0);
Get(":id")(SlidersController.prototype, "getById", descriptor("getById"));
Param("id")(SlidersController.prototype, "getById", 0);

for (const method of [
  "create",
  "update",
  "delete",
  "reorder",
  "updateSetting",
]) {
  UseGuards(LegacyAdminGuard)(
    SlidersController.prototype,
    method,
    descriptor(method),
  );
}

Post()(SlidersController.prototype, "create", descriptor("create"));
UseInterceptors(SliderImageInterceptor)(
  SlidersController.prototype,
  "create",
  descriptor("create"),
);
Req()(SlidersController.prototype, "create", 0);
Body()(SlidersController.prototype, "create", 1);

Put("setting")(
  SlidersController.prototype,
  "updateSetting",
  descriptor("updateSetting"),
);
HttpCode(200)(
  SlidersController.prototype,
  "updateSetting",
  descriptor("updateSetting"),
);
Body()(SlidersController.prototype, "updateSetting", 0);

Put("reorder")(SlidersController.prototype, "reorder", descriptor("reorder"));
HttpCode(200)(SlidersController.prototype, "reorder", descriptor("reorder"));
Body()(SlidersController.prototype, "reorder", 0);

Put(":id")(SlidersController.prototype, "update", descriptor("update"));
HttpCode(200)(SlidersController.prototype, "update", descriptor("update"));
UseInterceptors(SliderImageInterceptor)(
  SlidersController.prototype,
  "update",
  descriptor("update"),
);
Param("id")(SlidersController.prototype, "update", 0);
Req()(SlidersController.prototype, "update", 1);
Body()(SlidersController.prototype, "update", 2);

Delete(":id")(SlidersController.prototype, "delete", descriptor("delete"));
HttpCode(200)(SlidersController.prototype, "delete", descriptor("delete"));
Param("id")(SlidersController.prototype, "delete", 0);

export { SlidersController };
