import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { auditAdminRequest } from "../middleware/audit.js";
import { findTeamMemberById } from "../team-members/team-members.repository.js";
import { findUserById } from "../users/users.repository.js";

class LegacyAdminGuard {
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
    const account = user ?? member;

    if (!account) {
      throw new UnauthorizedException({
        success: false,
        message: "User not found",
      });
    }

    if (member && !member.active) {
      throw new ForbiddenException({
        success: false,
        message: "Account is inactive",
      });
    }

    if (!["admin", "super_admin", "manager"].includes(account.role)) {
      throw new ForbiddenException({
        success: false,
        message: "Admin access required",
      });
    }

    request.user = account;
    auditAdminRequest(request, context.switchToHttp().getResponse(), () => {});
    return true;
  }
}

Injectable()(LegacyAdminGuard);

export { LegacyAdminGuard };
