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
  Req,
  UseGuards,
} from "@nestjs/common";
import { PermissionGroupsService } from "./permission-groups.service.js";
import { PermissionGroupsSuperAdminGuard } from "./super-admin.guard.js";

class PermissionGroupsController {
  constructor(permissionGroupsService) {
    this.permissionGroupsService = permissionGroupsService;
  }

  async findAll() {
    return {
      success: true,
      groups: await this.permissionGroupsService.findAll(),
    };
  }

  async findById(id) {
    const group = await this.permissionGroupsService.findById(id);
    if (!group) {
      throw new NotFoundException({
        success: false,
        message: "Permission group not found",
      });
    }
    return { success: true, group };
  }

  async create(request, body) {
    return {
      success: true,
      group: await this.permissionGroupsService.create(
        body ?? {},
        request.user,
        request,
      ),
    };
  }

  async update(id, request, body) {
    return {
      success: true,
      group: await this.permissionGroupsService.update(
        id,
        body ?? {},
        request.user,
        request,
      ),
    };
  }

  async delete(id, request) {
    return this.permissionGroupsService.delete(id, request);
  }
}

Controller("permission-groups")(PermissionGroupsController);
Inject(PermissionGroupsService)(PermissionGroupsController, undefined, 0);

for (const method of ["findAll", "findById", "create", "update", "delete"]) {
  const descriptor = Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    method,
  );
  UseGuards(PermissionGroupsSuperAdminGuard)(
    PermissionGroupsController.prototype,
    method,
    descriptor,
  );
}

Get()(
  PermissionGroupsController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    "findAll",
  ),
);

Get(":id")(
  PermissionGroupsController.prototype,
  "findById",
  Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    "findById",
  ),
);
Param("id")(PermissionGroupsController.prototype, "findById", 0);

Post()(
  PermissionGroupsController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    "create",
  ),
);
Req()(PermissionGroupsController.prototype, "create", 0);
Body()(PermissionGroupsController.prototype, "create", 1);

Put(":id")(
  PermissionGroupsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    "update",
  ),
);
HttpCode(200)(
  PermissionGroupsController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    "update",
  ),
);
Param("id")(PermissionGroupsController.prototype, "update", 0);
Req()(PermissionGroupsController.prototype, "update", 1);
Body()(PermissionGroupsController.prototype, "update", 2);

Delete(":id")(
  PermissionGroupsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    "delete",
  ),
);
HttpCode(200)(
  PermissionGroupsController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(
    PermissionGroupsController.prototype,
    "delete",
  ),
);
Param("id")(PermissionGroupsController.prototype, "delete", 0);
Req()(PermissionGroupsController.prototype, "delete", 1);

export { PermissionGroupsController };
