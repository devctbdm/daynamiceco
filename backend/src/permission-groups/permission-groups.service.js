import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { createAuditLog } from "../audit/audit.repository.js";
import {
  clearTeamMemberPermissionGroup,
  countTeamMembersByPermissionGroups,
} from "../team-members/team-members.repository.js";
import { DATABASE } from "../db/database.js";
import { permissionGroupEntries } from "../models/PermissionGroup.js";
import { ACTIONS, MODULES } from "../utils/permissions.js";
class PermissionGroupsService {
  constructor(database) {
    this.database = database;
  }

  async findAll() {
    const groups = await this.database
      .select()
      .from(permissionGroupEntries)
      .orderBy(desc(permissionGroupEntries.createdAt));
    const usageCounts = await getUsageCounts(groups.map((group) => group.id));
    return groups.map((group) => ({
      ...serializePermissionGroup(group),
      usageCount: usageCounts.get(group.id) || 0,
    }));
  }

  async findById(id) {
    const [group] = await this.database
      .select()
      .from(permissionGroupEntries)
      .where(eq(permissionGroupEntries.id, id))
      .limit(1);
    if (!group) return null;
    const usageCounts = await getUsageCounts([group.id]);
    return {
      ...serializePermissionGroup(group),
      usageCount: usageCounts.get(group.id) || 0,
    };
  }

  async create(input, actor, request) {
    const name = validateName(input?.name);
    const description = validateDescription(input?.description);
    const color = validateColor(input?.color, "#6366f1");
    const permissions = validatePermissions(input?.permissions ?? []);
    const groupId = randomBytes(12).toString("hex");
    const actorSummary = serializeActor(actor);
    let group;
    try {
      [group] = await this.database
        .insert(permissionGroupEntries)
        .values({
          id: groupId,
          name,
          description,
          color,
          permissions,
          createdBy: actorSummary,
          updatedBy: actorSummary,
        })
        .returning();
    } catch (error) {
      if (error?.code === "23505") throw duplicateGroupName();
      throw error;
    }
    await logAction(request, "PERMISSION_GROUP_CREATED", group.id, {
      name: group.name,
    });
    return serializePermissionGroup(group);
  }

  async update(id, input, actor, request) {
    const [existing] = await this.database
      .select()
      .from(permissionGroupEntries)
      .where(eq(permissionGroupEntries.id, id))
      .limit(1);
    if (!existing) throw groupNotFound();

    const updates = { updatedAt: new Date(), updatedBy: serializeActor(actor) };
    if (input?.name !== undefined) updates.name = validateName(input.name);
    if (input?.description !== undefined) {
      updates.description = validateDescription(input.description);
    }
    if (input?.color !== undefined) {
      updates.color = validateColor(input.color, existing.color);
    }
    if (input?.active !== undefined) {
      if (typeof input.active !== "boolean") {
        throw new BadRequestException({
          success: false,
          message: "active must be a boolean",
        });
      }
      updates.active = input.active;
    }
    if (input?.permissions !== undefined) {
      updates.permissions = validatePermissions(input.permissions);
    }

    let group;
    try {
      [group] = await this.database
        .update(permissionGroupEntries)
        .set(updates)
        .where(eq(permissionGroupEntries.id, id))
        .returning();
    } catch (error) {
      if (error?.code === "23505") throw duplicateGroupName();
      throw error;
    }
    if (!group) throw groupNotFound();
    await logAction(request, "PERMISSION_GROUP_UPDATED", group.id, {
      name: group.name,
    });
    return serializePermissionGroup(group);
  }

  async delete(id, request) {
    const [group] = await this.database
      .select()
      .from(permissionGroupEntries)
      .where(eq(permissionGroupEntries.id, id))
      .limit(1);
    if (!group) throw groupNotFound();

    const usageCount = await clearTeamMemberPermissionGroup(group.id);

    await logAction(request, "PERMISSION_GROUP_DELETED", group.id, {
      name: group.name,
      affectedStaff: usageCount,
    });

    await this.database
      .delete(permissionGroupEntries)
      .where(eq(permissionGroupEntries.id, id));

    return {
      success: true,
      message: `Permission group "${group.name}" deleted. ${usageCount} staff member(s) reverted to role defaults.`,
    };
  }
}

function validateName(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException({
      success: false,
      message: "Name is required",
    });
  }
  const name = value.trim();
  if (name.length > 80) {
    throw new BadRequestException({
      success: false,
      message: "Name cannot be more than 80 characters",
    });
  }
  return name;
}

function validateDescription(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new BadRequestException({
      success: false,
      message: "Description must be a string",
    });
  }
  const description = value.trim();
  if (description.length > 300) {
    throw new BadRequestException({
      success: false,
      message: "Description cannot be more than 300 characters",
    });
  }
  return description;
}

function validateColor(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw new BadRequestException({
      success: false,
      message: "Color must be a string",
    });
  }
  return value.trim() || fallback;
}

function validatePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    throw new BadRequestException({
      success: false,
      message: "permissions must be an array",
    });
  }
  const validModules = new Set(MODULES.map((module) => module.key));
  for (const entry of permissions) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new BadRequestException({
        success: false,
        message: "Each permission must be an object",
      });
    }
    if (!validModules.has(entry.module)) {
      throw new BadRequestException({
        success: false,
        message: `Unknown module: "${entry.module}"`,
      });
    }
    for (const [key, value] of Object.entries(entry)) {
      if (key === "module") continue;
      if (!ACTIONS.includes(key)) {
        throw new BadRequestException({
          success: false,
          message: `Unknown action "${key}" on module "${entry.module}"`,
        });
      }
      if (typeof value !== "boolean") {
        throw new BadRequestException({
          success: false,
          message: `Permission action "${key}" must be a boolean`,
        });
      }
    }
  }
  return permissions.map((entry) => ({
    module: entry.module,
    ...Object.fromEntries(
      ACTIONS.map((action) => [action, entry[action] ?? false]),
    ),
  }));
}

function serializeActor(actor) {
  return {
    id: String(actor?._id ?? actor?.id ?? ""),
    name: actor?.name ?? "",
  };
}

async function getUsageCounts(groupIds) {
  if (!groupIds.length) return new Map();
  return countTeamMembersByPermissionGroups(groupIds);
}

function groupNotFound() {
  return new NotFoundException({
    success: false,
    message: "Permission group not found",
  });
}

function duplicateGroupName() {
  return new BadRequestException({
    success: false,
    message: "A permission group with this name already exists",
  });
}

async function logAction(request, eventType, target, changes = {}) {
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
    console.error("Permission group audit log failed:", error.message);
  }
}

Injectable()(PermissionGroupsService);
Inject(DATABASE)(PermissionGroupsService, undefined, 0);

export { PermissionGroupsService, validatePermissions };
