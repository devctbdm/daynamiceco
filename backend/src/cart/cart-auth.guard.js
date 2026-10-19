import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { getMaintenanceSetting } from "../maintenance/maintenance.service.js";
import { findTeamMemberById } from "../team-members/team-members.repository.js";
import { findUserById } from "../users/users.repository.js";

class CartAuthGuard {
  async canActivate(context) {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedException({
        success: false,
        message: "Not authorized, no token",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new UnauthorizedException({
        success: false,
        message: "Invalid token",
      });
    }

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.id !== "string" ||
      !/^[a-f\d]{24}$/i.test(decoded.id)
    ) {
      throw new UnauthorizedException({
        success: false,
        message: "Invalid token",
      });
    }

    const [user, member] = await Promise.all([
      findUserById(decoded.id),
      findTeamMemberById(decoded.id),
    ]);

    if (user) {
      request.user = user;
      request.isTeam = false;
      return true;
    }

    if (member) {
      if (!member.active) {
        throw new ForbiddenException({
          success: false,
          message: "Account is inactive",
        });
      }
      request.user = member;
      request.isTeam = true;
      return true;
    }

    throw new UnauthorizedException({
      success: false,
      message: "User not found",
    });
  }
}

Injectable()(CartAuthGuard);

class CartSellingGuard {
  async canActivate(context) {
    const request = context.switchToHttp().getRequest();
    const setting = await getMaintenanceSetting();

    if (
      setting.sellingEnabled !== false ||
      ["super_admin", "admin", "manager"].includes(request.user?.role)
    ) {
      return true;
    }

    throw new ForbiddenException({
      success: false,
      code: "SELLING_DISABLED",
      message:
        setting.sellingMessage?.trim() ||
        "Purchasing is temporarily disabled. You can browse products, but orders cannot be placed right now.",
    });
  }
}

Injectable()(CartSellingGuard);

export { CartAuthGuard, CartSellingGuard };
