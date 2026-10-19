import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE } from "../db/database.js";
import {
  defaultHolidayConfig,
  holidaySettings,
} from "../models/HolidayConfig.js";

class HolidayService {
  constructor(database) {
    this.database = database;
  }

  async getConfig() {
    const [config] = await this.database
      .select()
      .from(holidaySettings)
      .where(eq(holidaySettings.key, "default"))
      .limit(1);

    return config ?? defaultHolidayConfig();
  }

  async updateConfig(body) {
    const update = {};
    const stringFields = [
      "heroBadge",
      "title",
      "subtitle",
      "couponCode",
      "couponDescription",
      "topDealsTitle",
      "topDealsSubtitle",
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string") {
          throw new BadRequestException(`${field} must be a string`);
        }
        update[field] = body[field];
      }
    }

    if (body.discountPercent !== undefined) {
      const discountPercent = Number(body.discountPercent) || 0;
      if (!Number.isFinite(discountPercent) || discountPercent < 0) {
        throw new BadRequestException(
          "discountPercent must be a nonnegative number",
        );
      }
      update.discountPercent = discountPercent;
    }

    if (body.endDate !== undefined) {
      if (body.endDate === null || body.endDate === "") {
        update.endDate = null;
      } else {
        const endDate = new Date(body.endDate);
        if (Number.isNaN(endDate.getTime())) {
          throw new BadRequestException("endDate must be a valid date");
        }
        update.endDate = endDate;
      }
    }

    if (body.active !== undefined) {
      update.active = body.active === true || body.active === "true";
    }

    const [config] = await this.database
      .insert(holidaySettings)
      .values({ key: "default", ...update })
      .onConflictDoUpdate({
        target: holidaySettings.key,
        set: { ...update, updatedAt: new Date() },
      })
      .returning();

    if (!config) {
      throw new Error("Failed to save holiday configuration");
    }

    return config;
  }
}

Injectable()(HolidayService);
Inject(DATABASE)(HolidayService, undefined, 0);

export { HolidayService };
