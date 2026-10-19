import { Module } from "@nestjs/common";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";
import { CartAuthGuard } from "../cart/cart-auth.guard.js";
import {
  AuthController,
  SetupController,
  UsersController,
} from "./users.controller.js";
import { UsersService } from "./users.service.js";

class UsersModule {}

Module({
  controllers: [AuthController, UsersController, SetupController],
  providers: [UsersService, CartAuthGuard, LegacyAdminGuard],
})(UsersModule);

export default UsersModule;
