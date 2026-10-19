import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE, getDatabase } from "../db/database.js";
import { maintenanceSetting } from "../models/MaintenanceSetting.js";
import { LegacyAdminGuard } from "../auth/legacy-admin.guard.js";

class MaintenanceService {
  constructor(database) {
    this.database = database;
  }

  async getSetting() {
    return toPublic(await getMaintenanceSettingWithDatabase(this.database));
  }

  async updateSetting(input) {
    const updates = normalizeUpdates(input);
    const [setting] = await this.database
      .insert(maintenanceSetting)
      .values({ id: "default", ...updates })
      .onConflictDoUpdate({
        target: maintenanceSetting.id,
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();

    if (!setting) {
      throw new Error("Failed to update maintenance setting");
    }
    return toPublic(setting);
  }
}

async function getMaintenanceSetting() {
  return getMaintenanceSettingWithDatabase(getDatabase());
}

async function getMaintenanceSettingWithDatabase(database) {
  await database
    .insert(maintenanceSetting)
    .values({ id: "default" })
    .onConflictDoNothing({ target: maintenanceSetting.id });

  const [setting] = await database
    .select()
    .from(maintenanceSetting)
    .where(eq(maintenanceSetting.id, "default"))
    .limit(1);

  if (!setting) {
    throw new Error("Failed to load maintenance setting");
  }
  return setting;
}

function normalizeUpdates(input) {
  const updates = {};
  for (const field of ["enabled", "sellingEnabled"]) {
    if (typeof input?.[field] === "boolean") {
      updates[field] = input[field];
    }
  }
  for (const field of [
    "message",
    "contactEmail",
    "contactPhone",
    "sellingMessage",
  ]) {
    if (typeof input?.[field] === "string") {
      updates[field] = input[field].trim();
    }
  }
  if (typeof input?.endAt === "string" && input.endAt) {
    const endAt = new Date(input.endAt);
    if (Number.isNaN(endAt.getTime())) {
      throw new BadRequestException({
        success: false,
        message: "Invalid maintenance end date",
      });
    }
    updates.endAt = endAt;
  } else if (input?.endAt === null || input?.endAt === "") {
    updates.endAt = null;
  }
  return updates;
}

function toPublic(setting) {
  return {
    enabled: Boolean(setting.enabled),
    message: setting.message || "",
    endAt: setting.endAt ? setting.endAt.toISOString() : null,
    contactEmail: setting.contactEmail || "",
    contactPhone: setting.contactPhone || "",
    sellingEnabled: setting.sellingEnabled !== false,
    sellingMessage: setting.sellingMessage || "",
    updatedAt: setting.updatedAt ? setting.updatedAt.toISOString() : null,
  };
}

class MaintenanceSuperAdminGuard {
  constructor(legacyAdminGuard) {
    this.legacyAdminGuard = legacyAdminGuard;
  }

  async canActivate(context) {
    await this.legacyAdminGuard.canActivate(context);
    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== "super_admin") {
      throw new ForbiddenException({
        success: false,
        message: "Super admin access required",
      });
    }
    return true;
  }
}

Injectable()(MaintenanceService);
Inject(DATABASE)(MaintenanceService, undefined, 0);
Injectable()(MaintenanceSuperAdminGuard);
Inject(LegacyAdminGuard)(MaintenanceSuperAdminGuard, undefined, 0);

export {
  getMaintenanceSetting,
  MaintenanceService,
  MaintenanceSuperAdminGuard,
  toPublic,
};
