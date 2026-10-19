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
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { UsersService } from "./users.service.js";

class AuthController {
  constructor(usersService) {
    this.usersService = usersService;
  }

  async register(body) {
    const result = await this.usersService.register(body);
    return result.body;
  }

  async login(request, body) {
    return this.usersService.login(request, body);
  }

  async verifyOtp(request, body) {
    return this.usersService.verifyOtp(request, body);
  }

  async forgotPassword(body) {
    return this.usersService.forgotPassword(body);
  }

  async resetPassword(body) {
    return this.usersService.resetPassword(body);
  }

  async getMe(request) {
    return this.usersService.getMe(request);
  }

  async updateProfile(request, body) {
    return this.usersService.updateProfile(request, body);
  }

  async changePassword(request, body) {
    return this.usersService.changePassword(request.user._id, body);
  }

  async getSessions(request) {
    return this.usersService.getSessions(request.user._id);
  }

  async revokeSession(request, id) {
    return this.usersService.revokeSession(request.user._id, id);
  }

  async getAddresses(request) {
    return this.usersService.getAddresses(request.user._id);
  }

  async addAddress(request, body) {
    const result = await this.usersService.addAddress(request.user._id, body);
    return result.body;
  }

  async updateAddress(request, id, body) {
    return this.usersService.updateAddress(request.user._id, id, body);
  }

  async deleteAddress(request, id) {
    return this.usersService.deleteAddress(request.user._id, id);
  }

  async setDefaultAddress(request, id) {
    return this.usersService.setDefaultAddress(request.user._id, id);
  }
}

Controller("auth")(AuthController);
Inject(UsersService)(AuthController, undefined, 0);

const authMethod = (method, decorator, path, guarded = false) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    AuthController.prototype,
    method,
  );
  if (path === undefined) {
    decorator()(AuthController.prototype, method, descriptor);
  } else {
    decorator(path)(AuthController.prototype, method, descriptor);
  }
  if (guarded) {
    UseGuards(CartAuthGuard)(AuthController.prototype, method, descriptor);
    if (guarded === "admin") {
      UseGuards(LegacyAdminGuard)(AuthController.prototype, method, descriptor);
    }
  }
};

authMethod("register", Post);
authMethod("login", Post, "login");
authMethod("verifyOtp", Post, "verify-otp");
authMethod("forgotPassword", Post, "forgot-password");
authMethod("resetPassword", Post, "reset-password");
authMethod("getMe", Get, "me", true);
authMethod("updateProfile", Put, "me", true);
authMethod("changePassword", Put, "me/password", true);
authMethod("getSessions", Get, "me/sessions", true);
authMethod("revokeSession", Delete, "me/sessions/:id", true);
authMethod("getAddresses", Get, "me/addresses", true);
authMethod("addAddress", Post, "me/addresses", true);
authMethod("updateAddress", Put, "me/addresses/:id", true);
authMethod("deleteAddress", Delete, "me/addresses/:id", true);
authMethod("setDefaultAddress", Put, "me/addresses/:id/default", true);

for (const method of [
  "login",
  "verifyOtp",
  "forgotPassword",
  "resetPassword",
]) {
  HttpCode(200)(
    AuthController.prototype,
    method,
    Object.getOwnPropertyDescriptor(AuthController.prototype, method),
  );
}

Body()(AuthController.prototype, "register", 0);
Req()(AuthController.prototype, "login", 0);
Body()(AuthController.prototype, "login", 1);
Req()(AuthController.prototype, "verifyOtp", 0);
Body()(AuthController.prototype, "verifyOtp", 1);
Body()(AuthController.prototype, "forgotPassword", 0);
Body()(AuthController.prototype, "resetPassword", 0);
Req()(AuthController.prototype, "getMe", 0);
Req()(AuthController.prototype, "updateProfile", 0);
Body()(AuthController.prototype, "updateProfile", 1);
Req()(AuthController.prototype, "changePassword", 0);
Body()(AuthController.prototype, "changePassword", 1);
Req()(AuthController.prototype, "getSessions", 0);
Req()(AuthController.prototype, "revokeSession", 0);
Param("id")(AuthController.prototype, "revokeSession", 1);
Req()(AuthController.prototype, "getAddresses", 0);
Req()(AuthController.prototype, "addAddress", 0);
Body()(AuthController.prototype, "addAddress", 1);
Req()(AuthController.prototype, "updateAddress", 0);
Param("id")(AuthController.prototype, "updateAddress", 1);
Body()(AuthController.prototype, "updateAddress", 2);
Req()(AuthController.prototype, "deleteAddress", 0);
Param("id")(AuthController.prototype, "deleteAddress", 1);
Req()(AuthController.prototype, "setDefaultAddress", 0);
Param("id")(AuthController.prototype, "setDefaultAddress", 1);

class UsersController {
  constructor(usersService) {
    this.usersService = usersService;
  }

  async findAll(query) {
    return this.usersService.findAll(query);
  }

  async getById(id) {
    return this.usersService.getById(id);
  }

  async create(body) {
    const result = await this.usersService.create(body);
    return result.body;
  }

  async update(id, request, body) {
    return this.usersService.update(id, body, request.user);
  }

  async delete(id) {
    return this.usersService.delete(id);
  }
}

Controller("users")(UsersController);
Inject(UsersService)(UsersController, undefined, 0);
UseGuards(LegacyAdminGuard)(UsersController);

Get()(
  UsersController.prototype,
  "findAll",
  Object.getOwnPropertyDescriptor(UsersController.prototype, "findAll"),
);
Query()(UsersController.prototype, "findAll", 0);
Get(":id")(
  UsersController.prototype,
  "getById",
  Object.getOwnPropertyDescriptor(UsersController.prototype, "getById"),
);
Param("id")(UsersController.prototype, "getById", 0);
Post()(
  UsersController.prototype,
  "create",
  Object.getOwnPropertyDescriptor(UsersController.prototype, "create"),
);
Body()(UsersController.prototype, "create", 0);
Put(":id")(
  UsersController.prototype,
  "update",
  Object.getOwnPropertyDescriptor(UsersController.prototype, "update"),
);
Param("id")(UsersController.prototype, "update", 0);
Req()(UsersController.prototype, "update", 1);
Body()(UsersController.prototype, "update", 2);
Delete(":id")(
  UsersController.prototype,
  "delete",
  Object.getOwnPropertyDescriptor(UsersController.prototype, "delete"),
);
Param("id")(UsersController.prototype, "delete", 0);

class SetupController {
  constructor(usersService) {
    this.usersService = usersService;
  }

  async status() {
    return this.usersService.getSetupStatus();
  }

  async run(body) {
    const result = await this.usersService.runSetup(body);
    return result.body;
  }
}

Controller("setup")(SetupController);
Inject(UsersService)(SetupController, undefined, 0);
Get("status")(
  SetupController.prototype,
  "status",
  Object.getOwnPropertyDescriptor(SetupController.prototype, "status"),
);
Post()(
  SetupController.prototype,
  "run",
  Object.getOwnPropertyDescriptor(SetupController.prototype, "run"),
);
Body()(SetupController.prototype, "run", 0);

export { AuthController, SetupController, UsersController };
