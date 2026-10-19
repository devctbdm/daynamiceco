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
import { OfferImageInterceptor } from "./offer-image.interceptor.js";
import { OffersService } from "./offers.service.js";

class OffersController {
  constructor(offersService) {
    this.offersService = offersService;
  }

  async findAll(active, limit) {
    return {
      success: true,
      offers: await this.offersService.findAll(active === "true", limit),
    };
  }

  async findBySlug(slug) {
    const offer = await this.offersService.findBySlug(slug);
    if (!offer) throw offerNotFound();
    return { success: true, offer };
  }

  async findById(id) {
    const offer = await this.offersService.findById(id);
    if (!offer) throw offerNotFound();
    return { success: true, offer };
  }

  async create(request, body) {
    return {
      success: true,
      offer: await this.offersService.create(
        body,
        request.file,
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async update(id, body, request) {
    const offer = await this.offersService.update(id, body, request.file);
    if (!offer) throw offerNotFound();
    return { success: true, offer };
  }

  async delete(id) {
    if (!(await this.offersService.delete(id))) throw offerNotFound();
    return { success: true, message: "Offer deleted successfully" };
  }
}

function offerNotFound() {
  return new NotFoundException({ success: false, message: "Offer not found" });
}

Controller("offers")(OffersController);
Inject(OffersService)(OffersController, undefined, 0);

Get()(
  OffersController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "findAll"),
);
Query("active")(OffersController.prototype, "findAll", 0);
Query("limit")(OffersController.prototype, "findAll", 1);

Get("slug/:slug")(
  OffersController.prototype,
  "findBySlug",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "findBySlug"),
);
Param("slug")(OffersController.prototype, "findBySlug", 0);

Get(":id")(
  OffersController.prototype,
  "findById",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "findById"),
);
Param("id")(OffersController.prototype, "findById", 0);

Post()(
  OffersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "create"),
);
UseGuards(LegacyAdminGuard)(
  OffersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "create"),
);
UseInterceptors(OfferImageInterceptor)(
  OffersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "create"),
);
Req()(OffersController.prototype, "create", 0);
Body()(OffersController.prototype, "create", 1);

Put(":id")(
  OffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "update"),
);
HttpCode(200)(
  OffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  OffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "update"),
);
UseInterceptors(OfferImageInterceptor)(
  OffersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "update"),
);
Param("id")(OffersController.prototype, "update", 0);
Body()(OffersController.prototype, "update", 1);
Req()(OffersController.prototype, "update", 2);

Delete(":id")(
  OffersController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "delete"),
);
HttpCode(200)(
  OffersController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "delete"),
);
UseGuards(LegacyAdminGuard)(
  OffersController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(OffersController.prototype, "delete"),
);
Param("id")(OffersController.prototype, "delete", 0);

export { OffersController };
