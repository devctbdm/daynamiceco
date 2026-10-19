import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  createAuditLog,
  findAuditLogsByEventTypes,
} from "../audit/audit.repository.js";
import { findPermissionGroupById } from "../permission-groups/permission-groups.repository.js";
import { ACTIONS, MODULES, resolvePermissions } from "../utils/permissions.js";
import {
  countTeamMembers,
  deleteTeamMember,
  findTeamMemberByEmail,
  findTeamMemberById,
  listTeamMembers,
  createTeamMember as insertTeamMember,
  updateTeamMember as updateTeamMemberRow,
} from "./team-members.repository.js";

const VALID_ROLES = ["admin", "manager", "super_admin"];

class TeamMembersService {
  async getTeamMembers() {
    return { success: true, members: await listTeamMembers() };
  }

  async createTeamMember(input = {}) {
    const { name, email, password, role, active } = input;
    const normalizedEmail = normalizeEmail(email);
    validateNameAndEmail(name, normalizedEmail);
    if (typeof password !== "string" || password.length < 6) {
      throw badRequest("Password must be at least 6 characters");
    }
    if (role && !VALID_ROLES.includes(role)) throw badRequest("Invalid role");
    if (await findTeamMemberByEmail(normalizedEmail)) {
      throw badRequest("Email already exists");
    }
    const member = await insertTeamMember({
      id: randomBytes(12).toString("hex"),
      name: String(name).trim(),
      email: normalizedEmail,
      password: await hashPassword(password),
      role: role || "manager",
      active: typeof active === "boolean" ? active : true,
      phone: "",
      avatar: "",
      customPermissions: [],
      twoFactorAttempts: 0,
      loginAttempts: 0,
    });
    return {
      statusCode: 201,
      body: { success: true, member: publicMember(member) },
    };
  }

  async updateTeamMember(id, input = {}) {
    const member = await findTeamMemberById(id, { includeSensitive: true });
    if (!member) throw teamMemberNotFound();
    const updates = {};
    if (input.name !== undefined) {
      validateNameAndEmail(input.name, member.email);
      updates.name = input.name.trim();
    }
    if (input.email !== undefined) {
      updates.email = normalizeEmail(input.email);
      validateNameAndEmail(member.name, updates.email);
    }
    if (input.role !== undefined) {
      if (!VALID_ROLES.includes(input.role)) throw badRequest("Invalid role");
      updates.role = input.role;
    }
    if (typeof input.active === "boolean") updates.active = input.active;
    if (input.password?.trim()) {
      if (input.password.length < 6) {
        throw badRequest("Password must be at least 6 characters");
      }
      updates.password = await hashPassword(input.password);
    }
    if (updates.email && updates.email !== member.email) {
      const duplicate = await findTeamMemberByEmail(updates.email);
      if (duplicate) throw badRequest("Email already exists");
    }
    const updated = await updateTeamMemberRow(id, updates);
    return { success: true, member: publicMember(updated) };
  }

  async deleteTeamMember(id) {
    const member = await deleteTeamMember(id);
    if (!member) throw teamMemberNotFound();
    return { success: true, message: "Team member deleted" };
  }

  async getStaffStats() {
    const [total, active, inactive, bySuperAdmin, byAdmin, byManager] =
      await Promise.all([
        countTeamMembers(),
        countTeamMembers({ active: true }),
        countTeamMembers({ active: false }),
        countTeamMembers({ role: "super_admin" }),
        countTeamMembers({ role: "admin" }),
        countTeamMembers({ role: "manager" }),
      ]);
    const recentActivity = await findAuditLogsByEventTypes(
      [
        "STAFF_CREATED",
        "STAFF_UPDATED",
        "STAFF_DELETED",
        "STAFF_STATUS_CHANGED",
        "STAFF_PERMISSIONS_UPDATED",
        "STAFF_ROLE_CHANGED",
      ],
      { limit: 10 },
    );
    return {
      success: true,
      stats: {
        total,
        active,
        inactive,
        byRole: {
          super_admin: bySuperAdmin,
          admin: byAdmin,
          manager: byManager,
        },
      },
      recentActivity,
    };
  }

  async getStaff(query = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const filters = {};
    if (query.search) filters.search = String(query.search);
    if (query.role && query.role !== "all") filters.role = String(query.role);
    if (query.status === "active") filters.active = true;
    if (query.status === "inactive") filters.active = false;
    const [total, members] = await Promise.all([
      countTeamMembers(filters),
      listTeamMembers({ filters, page, limit }),
    ]);
    return {
      success: true,
      count: members.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      members: await Promise.all(
        members.map((member) => this.withPermissionGroup(member)),
      ),
    };
  }

  async getStaffById(id) {
    const member = await findTeamMemberById(id);
    if (!member) throw staffNotFound();
    const group = await findPermissionGroupById(member.permissionGroup);
    return {
      success: true,
      member: await this.withPermissionGroup(member, true),
      effectivePermissions: resolvePermissions(member, group),
    };
  }

  async createStaff(input = {}, request) {
    const name = String(input.name || "").trim();
    const email = normalizeEmail(input.email);
    const { password, phone, role, permissionGroup, customPermissions } = input;
    validateNameAndEmail(name, email);
    if (typeof password !== "string" || password.length < 8) {
      throw badRequest("Password must be at least 8 characters");
    }
    if (role && !VALID_ROLES.includes(role)) throw badRequest("Invalid role");
    if (customPermissions !== undefined) validatePermissions(customPermissions);
    if (await findTeamMemberByEmail(email))
      throw badRequest("Email already in use");
    if (permissionGroup && !(await findPermissionGroupById(permissionGroup))) {
      throw badRequest("Permission group not found");
    }
    const member = await insertTeamMember({
      id: randomBytes(12).toString("hex"),
      name,
      email,
      password: await hashPassword(password),
      phone: normalizePhone(phone),
      role: role || "manager",
      permissionGroup: permissionGroup || null,
      customPermissions: customPermissions || [],
    });
    await logStaffAction(request, "STAFF_CREATED", member._id, {
      name: member.name,
      email: member.email,
      role: member.role,
    });
    return {
      statusCode: 201,
      body: { success: true, member: publicMember(member) },
    };
  }

  async updateStaff(id, input = {}, request) {
    const member = await findTeamMemberById(id, { includeSensitive: true });
    if (!member) throw staffNotFound();
    const {
      name,
      email,
      phone,
      password,
      role,
      permissionGroup,
      customPermissions,
    } = input;
    const changes = {};
    const updates = {};

    if (role !== undefined && role !== member.role) {
      if (!VALID_ROLES.includes(role)) throw badRequest("Invalid role");
      if (String(request.user._id) === String(member._id)) {
        throw new ForbiddenException({
          success: false,
          message: "You cannot change your own role",
        });
      }
      if (
        member.role === "super_admin" &&
        role !== "super_admin" &&
        (await countTeamMembers({
          role: "super_admin",
          active: true,
          excludeId: member._id,
        })) === 0
      ) {
        throw forbidden("Cannot demote the last active super admin");
      }
      changes.role = { from: member.role, to: role };
      updates.role = role;
    }
    if (name !== undefined) {
      validateNameAndEmail(name, member.email);
      updates.name = name.trim();
      changes.name = name.trim();
    }
    if (email !== undefined) {
      const newEmail = normalizeEmail(email);
      validateNameAndEmail(member.name, newEmail);
      if (newEmail !== member.email) {
        const duplicate = await findTeamMemberByEmail(newEmail);
        if (duplicate) throw badRequest("Email already in use");
      }
      updates.email = newEmail;
      changes.email = newEmail;
    }
    if (phone !== undefined) {
      if (typeof phone !== "string") throw badRequest("Phone must be a string");
      updates.phone = phone.trim();
    }
    if (password && password.length >= 8) {
      updates.password = await hashPassword(password);
      changes.passwordChanged = true;
    }
    if (customPermissions !== undefined) {
      if (!Array.isArray(customPermissions)) {
        throw badRequest("customPermissions must be an array");
      }
      if (customPermissions.length) validatePermissions(customPermissions);
      updates.customPermissions = customPermissions;
      updates.permissionGroup = null;
      changes.permissionsUpdated = true;
    } else if (permissionGroup !== undefined) {
      if (
        permissionGroup &&
        !(await findPermissionGroupById(permissionGroup))
      ) {
        throw badRequest("Permission group not found");
      }
      updates.permissionGroup = permissionGroup || null;
      updates.customPermissions = [];
      changes.permissionsUpdated = true;
    }
    const updated = await updateTeamMemberRow(member._id, updates);
    const eventType = changes.role
      ? "STAFF_ROLE_CHANGED"
      : changes.permissionsUpdated
        ? "STAFF_PERMISSIONS_UPDATED"
        : "STAFF_UPDATED";
    await logStaffAction(request, eventType, updated._id, {
      target: updated.name,
      ...changes,
    });
    return {
      success: true,
      member: await this.withPermissionGroup(updated),
    };
  }

  async toggleStaffStatus(id, request) {
    const member = await findTeamMemberById(id);
    if (!member) throw staffNotFound();
    if (String(request.user._id) === String(member._id)) {
      throw forbidden("You cannot deactivate your own account");
    }
    const nextActive = !member.active;
    if (
      member.role === "super_admin" &&
      !nextActive &&
      (await countTeamMembers({
        role: "super_admin",
        active: true,
        excludeId: member._id,
      })) === 0
    ) {
      throw forbidden("Cannot deactivate the last active super admin");
    }
    const updated = await updateTeamMemberRow(member._id, {
      active: nextActive,
    });
    await logStaffAction(request, "STAFF_STATUS_CHANGED", member._id, {
      target: member.name,
      active: nextActive,
    });
    return {
      success: true,
      active: updated.active,
      message: `${member.name} is now ${updated.active ? "active" : "inactive"}`,
    };
  }

  async deleteStaff(id, request) {
    const member = await findTeamMemberById(id);
    if (!member) throw staffNotFound();
    if (String(request.user._id) === String(member._id)) {
      throw forbidden("You cannot delete your own account");
    }
    if (
      member.role === "super_admin" &&
      (await countTeamMembers({
        role: "super_admin",
        active: true,
        excludeId: member._id,
      })) === 0
    ) {
      throw forbidden("Cannot delete the last active super admin");
    }
    await logStaffAction(request, "STAFF_DELETED", member._id, {
      name: member.name,
      email: member.email,
      role: member.role,
    });
    await deleteTeamMember(member._id);
    return { success: true, message: `${member.name} has been removed` };
  }

  async withPermissionGroup(member, includePermissions = false) {
    const output = publicMember(member);
    const group = await findPermissionGroupById(member.permissionGroup);
    output.permissionGroup = group
      ? {
          _id: group._id,
          name: group.name,
          color: group.color,
          description: group.description,
          ...(includePermissions ? { permissions: group.permissions } : {}),
        }
      : null;
    return output;
  }
}

function publicMember(member) {
  if (!member) return null;
  const {
    password,
    twoFactorOtp,
    twoFactorOtpExpire,
    twoFactorAttempts,
    loginAttempts,
    lockUntil,
    ...safe
  } = member;
  return safe;
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePhone(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw badRequest("Phone must be a string");
  return value.trim();
}

function validateNameAndEmail(name, email) {
  if (typeof name !== "string" || !name.trim()) {
    throw badRequest("Name is required");
  }
  if (!email) throw badRequest("Email is required");
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function validatePermissions(perms) {
  if (!Array.isArray(perms))
    throw badRequest("customPermissions must be an array");
  const validModules = new Set(MODULES.map((module) => module.key));
  for (const entry of perms) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !validModules.has(entry.module)
    ) {
      throw badRequest(`Unknown module: "${entry?.module}"`);
    }
    for (const action of Object.keys(entry)) {
      if (action !== "module" && !ACTIONS.includes(action)) {
        throw badRequest(
          `Unknown action "${action}" on module "${entry.module}"`,
        );
      }
    }
  }
}

async function logStaffAction(request, eventType, target, changes = {}) {
  try {
    await createAuditLog({
      actor: {
        id: request.user?.id ?? request.user?._id,
        name: request.user?.name,
        role: request.user?.role,
      },
      action: eventType,
      target: String(target || ""),
      changes,
      ip: request.ip || request.connection?.remoteAddress || "",
      userAgent: request.headers["user-agent"] || "",
      eventType,
    });
  } catch (error) {
    console.error("Failed to write staff audit log:", error.message);
  }
}

function badRequest(message) {
  return new BadRequestException({ success: false, message });
}

function forbidden(message) {
  return new ForbiddenException({ success: false, message });
}

function teamMemberNotFound() {
  return new NotFoundException({
    success: false,
    message: "Team member not found",
  });
}

function staffNotFound() {
  return new NotFoundException({
    success: false,
    message: "Staff member not found",
  });
}

Injectable()(TeamMembersService);

export { TeamMembersService };
