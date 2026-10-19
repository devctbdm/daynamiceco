import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { PromosService } from "./promos.service.js";

class PromosController {
  constructor(promosService) {
    this.promosService = promosService;
  }

  async validate(body) {
    return this.promosService.validate(body ?? {});
  }

  async findAll(query) {
    return this.promosService.findAll(query);
  }

  async getStats() {
    return this.promosService.getStats();
  }

  async create(request, body) {
    return {
      success: true,
      promo: await this.promosService.create(
        body ?? {},
        request.user?._id ?? request.user?.id,
      ),
    };
  }

  async update(id, body) {
    return {
      success: true,
      promo: await this.promosService.update(id, body ?? {}),
    };
  }

  async delete(id) {
    await this.promosService.delete(id);
    return { success: true, message: "Promo code deleted successfully" };
  }
}

Controller("promo")(PromosController);
Inject(PromosService)(PromosController, undefined, 0);

Post("validate")(
  PromosController.prototype,
  "validate",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "validate"),
);
HttpCode(200)(
  PromosController.prototype,
  "validate",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "validate"),
);
Body()(PromosController.prototype, "validate", 0);

Get()(
  PromosController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "findAll"),
);
UseGuards(LegacyAdminGuard)(
  PromosController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "findAll"),
);
Query()(PromosController.prototype, "findAll", 0);

Get("stats")(
  PromosController.prototype,
  "getStats",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "getStats"),
);
UseGuards(LegacyAdminGuard)(
  PromosController.prototype,
  "getStats",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "getStats"),
);

Post()(
  PromosController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "create"),
);
UseGuards(LegacyAdminGuard)(
  PromosController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "create"),
);
Req()(PromosController.prototype, "create", 0);
Body()(PromosController.prototype, "create", 1);

Put(":id")(
  PromosController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "update"),
);
HttpCode(200)(
  PromosController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "update"),
);
UseGuards(LegacyAdminGuard)(
  PromosController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "update"),
);
Param("id")(PromosController.prototype, "update", 0);
Body()(PromosController.prototype, "update", 1);

Delete(":id")(
  PromosController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "delete"),
);
HttpCode(200)(
  PromosController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "delete"),
);
UseGuards(LegacyAdminGuard)(
  PromosController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(PromosController.prototype, "delete"),
);
Param("id")(PromosController.prototype, "delete", 0);

export { PromosController };
