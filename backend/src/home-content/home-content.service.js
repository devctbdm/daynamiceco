import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE } from "../db/database.js";
import { homePageContent } from "../models/HomeContent.js";

class HomeContentService {
  constructor(database) {
    this.database = database;
  }

  async getContent() {
    const [content] = await this.database
      .select()
      .from(homePageContent)
      .where(eq(homePageContent.id, "default"))
      .limit(1);

    return toResponse(content);
  }

  async upsertContent(input, userId) {
    const updates = { updatedBy: userId ?? null };
    if (typeof input?.content === "string") {
      updates.content = input.content;
    }
    if (typeof input?.enabled === "boolean") {
      updates.enabled = input.enabled;
    }

    const [content] = await this.database
      .insert(homePageContent)
      .values({ id: "default", ...updates })
      .onConflictDoUpdate({
        target: homePageContent.id,
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();

    if (!content) {
      throw new Error("Failed to save home page content");
    }

    return toResponse(content);
  }

  async deleteContent() {
    await this.database
      .delete(homePageContent)
      .where(eq(homePageContent.id, "default"));
  }
}

function toResponse(content) {
  return {
    _id: content?.id ?? null,
    content: content?.content || "",
    enabled: content?.enabled ?? true,
    createdAt: content?.createdAt ?? null,
    updatedAt: content?.updatedAt ?? null,
  };
}

Injectable()(HomeContentService);
Inject(DATABASE)(HomeContentService, undefined, 0);

export { HomeContentService };
