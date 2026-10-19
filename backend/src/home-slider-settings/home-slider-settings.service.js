import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE } from "../db/database.js";
import { homeSliderSettings } from "../models/HomeSliderSetting.js";

class HomeSliderSettingsService {
  constructor(database) {
    this.database = database;
  }

  async getSetting() {
    await this.database
      .insert(homeSliderSettings)
      .values({ id: "default" })
      .onConflictDoNothing({ target: homeSliderSettings.id });

    const [setting] = await this.database
      .select({ enabled: homeSliderSettings.enabled })
      .from(homeSliderSettings)
      .where(eq(homeSliderSettings.id, "default"))
      .limit(1);

    if (!setting) {
      throw new Error("Failed to load home slider setting");
    }
    return setting;
  }

  async updateSetting(input) {
    const updates = {
      ...(typeof input?.enabled === "boolean"
        ? { enabled: input.enabled }
        : {}),
      updatedAt: new Date(),
    };

    const [setting] = await this.database
      .insert(homeSliderSettings)
      .values({
        id: "default",
        ...(typeof input?.enabled === "boolean"
          ? { enabled: input.enabled }
          : {}),
      })
      .onConflictDoUpdate({
        target: homeSliderSettings.id,
        set: updates,
      })
      .returning({ enabled: homeSliderSettings.enabled });

    if (!setting) {
      throw new Error("Failed to update home slider setting");
    }
    return setting;
  }
}

Injectable()(HomeSliderSettingsService);
Inject(DATABASE)(HomeSliderSettingsService, undefined, 0);

export { HomeSliderSettingsService };
