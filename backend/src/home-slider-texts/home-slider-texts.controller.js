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
import { HomeSliderTextsService } from "./home-slider-texts.service.js";

class HomeSliderTextsController {
  constructor(homeSliderTextsService) {
    this.homeSliderTextsService = homeSliderTextsService;
  }

  async findAll(active) {
    return {
      success: true,
      texts: await this.homeSliderTextsService.findAll(active === "true"),
    };
  }

  async findById(id) {
    const text = await this.homeSliderTextsService.findById(id);
    if (!text) {
      throw notFound();
    }
    return { success: true, text };
  }

  async create(request, body) {
    return {
      success: true,
      text: await this.homeSliderTextsService.create(
        body,
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async update(id, body) {
    const text = await this.homeSliderTextsService.update(id, body);
    if (!text) {
      throw notFound();
    }
    return { success: true, text };
  }

  async delete(id) {
    if (!(await this.homeSliderTextsService.delete(id))) {
      throw notFound();
    }
    return { success: true, message: "Text deleted" };
  }

  async reorder(body) {
    await this.homeSliderTextsService.reorder(body?.orders);
    return { success: true, message: "Texts reordered" };
  }
}

function notFound() {
  return new NotFoundException({ success: false, message: "Text not found" });
}

Controller("home-slider-texts")(HomeSliderTextsController);
Inject(HomeSliderTextsService)(HomeSliderTextsController, undefined, 0);

Get()(
  HomeSliderTextsController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "findAll",
  ),
);
Query("active")(HomeSliderTextsController.prototype, "findAll", 0);

Get(":id")(
  HomeSliderTextsController.prototype,
  "findById",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "findById",
  ),
);
Param("id")(HomeSliderTextsController.prototype, "findById", 0);

Post()(
  HomeSliderTextsController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "create",
  ),
);
UseGuards(LegacyAdminGuard)(
  HomeSliderTextsController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "create",
  ),
);
Req()(HomeSliderTextsController.prototype, "create", 0);
Body()(HomeSliderTextsController.prototype, "create", 1);

Put("reorder")(
  HomeSliderTextsController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "reorder",
  ),
);
HttpCode(200)(
  HomeSliderTextsController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "reorder",
  ),
);
UseGuards(LegacyAdminGuard)(
  HomeSliderTextsController.prototype,
  "reorder",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "reorder",
  ),
);
Body()(HomeSliderTextsController.prototype, "reorder", 0);

Put(":id")(
  HomeSliderTextsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "update",
  ),
);
HttpCode(200)(
  HomeSliderTextsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "update",
  ),
);
UseGuards(LegacyAdminGuard)(
  HomeSliderTextsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "update",
  ),
);
Param("id")(HomeSliderTextsController.prototype, "update", 0);
Body()(HomeSliderTextsController.prototype, "update", 1);

Delete(":id")(
  HomeSliderTextsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "delete",
  ),
);
HttpCode(200)(
  HomeSliderTextsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "delete",
  ),
);
UseGuards(LegacyAdminGuard)(
  HomeSliderTextsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(
    HomeSliderTextsController.prototype,
    "delete",
  ),
);
Param("id")(HomeSliderTextsController.prototype, "delete", 0);

export { HomeSliderTextsController };
