import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE } from "../db/database.js";
import {
  serializeStoreSettings,
  storeSettings,
} from "../models/StoreSetting.js";

const FIELDS = [
  "storeName",
  "storeUrl",
  "email",
  "phone",
  "description",
  "logoText",
  "logoSubText",
  "logoIconUrl",
  "logoUrl",
  "currency",
  "timezone",
  "address",
  "metaTitle",
  "metaDescription",
];

const FOOTER_TEXT_LIMIT = 300;

function isSafeFooterLink(value, { social = false, webOnly = false } = {}) {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (!value) return true;
  if (!social && !webOnly && value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      (!social &&
        !webOnly &&
        (url.protocol === "mailto:" || url.protocol === "tel:"))
    );
  } catch {
    return false;
  }
}

function validateFooterConfig(config) {
  const invalid = () => {
    throw new BadRequestException("footerConfig is invalid");
  };
  const isRecord = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isText = (value) =>
    typeof value === "string" && value.length <= FOOTER_TEXT_LIMIT;
  const isEnabledSection = (section) =>
    isRecord(section) && typeof section.enabled === "boolean";

  if (
    !isRecord(config) ||
    typeof config.enabled !== "boolean" ||
    !isEnabledSection(config.support) ||
    !isText(config.support.title) ||
    !isText(config.support.hours) ||
    !isText(config.support.phone) ||
    !isText(config.support.locationTitle) ||
    !isText(config.support.location) ||
    !isEnabledSection(config.about) ||
    !isText(config.about.title) ||
    !Array.isArray(config.about.links) ||
    config.about.links.length > 50 ||
    !isEnabledSection(config.contact) ||
    !isText(config.contact.title) ||
    !isText(config.contact.addressLabel) ||
    !isText(config.contact.phoneLabel) ||
    !isText(config.contact.emailLabel) ||
    !isEnabledSection(config.apps) ||
    !isText(config.apps.title) ||
    !isText(config.apps.googlePlayLabel) ||
    !isSafeFooterLink(config.apps.googlePlayUrl, { webOnly: true }) ||
    !isText(config.apps.appStoreLabel) ||
    !isSafeFooterLink(config.apps.appStoreUrl, { webOnly: true }) ||
    !isEnabledSection(config.social) ||
    !Array.isArray(config.social.links) ||
    config.social.links.length > 50 ||
    !isRecord(config.copyright) ||
    !isText(config.copyright.text) ||
    typeof config.copyright.poweredBy !== "boolean" ||
    !isText(config.copyright.poweredByLabel) ||
    !isText(config.copyright.poweredByText)
  ) {
    invalid();
  }

  for (const link of config.about.links) {
    if (
      !isRecord(link) ||
      typeof link.id !== "string" ||
      link.id.length > 100 ||
      !isText(link.label) ||
      (link.enabled && (!link.label.trim() || !link.url?.trim())) ||
      !isSafeFooterLink(link.url) ||
      typeof link.enabled !== "boolean"
    ) {
      invalid();
    }
  }
  for (const link of config.social.links) {
    if (
      !isRecord(link) ||
      typeof link.id !== "string" ||
      link.id.length > 100 ||
      !isText(link.label) ||
      typeof link.icon !== "string" ||
      link.icon.length > 100 ||
      (link.enabled && (!link.label.trim() || !link.url?.trim())) ||
      !isSafeFooterLink(link.url, { social: true }) ||
      typeof link.enabled !== "boolean"
    ) {
      invalid();
    }
  }
}

function serializeSettings(row) {
  const settings = serializeStoreSettings(row);
  const footerConfig = settings.footerConfig ?? {};
  const copyright = footerConfig.copyright ?? {};
  return {
    ...settings,
    footerConfig: {
      ...footerConfig,
      copyright: {
        ...copyright,
        poweredByLabel: copyright.poweredByLabel ?? "Powered by",
      },
    },
  };
}

class StoreSettingsService {
  constructor(database) {
    this.database = database;
  }

  async getSettings() {
    const [settings] = await this.database
      .insert(storeSettings)
      .values({ id: "default" })
      .onConflictDoNothing({ target: storeSettings.id })
      .returning();
    if (settings) return serializeSettings(settings);

    const [existing] = await this.database
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, "default"))
      .limit(1);
    if (!existing) throw new Error("Failed to load store settings");
    return serializeSettings(existing);
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    return Object.fromEntries(
      [
        "storeName",
        "storeUrl",
        "email",
        "phone",
        "description",
        "logoType",
        "logoText",
        "logoSubText",
        "logoIconUrl",
        "logoUrl",
        "currency",
        "timezone",
        "address",
        "metaTitle",
        "metaDescription",
        "footerConfig",
      ].map((field) => [field, settings[field]]),
    );
  }

  async updateSettings(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestException("Settings must be an object");
    }

    const updates = {};
    for (const field of FIELDS) {
      if (input[field] === undefined) continue;
      if (typeof input[field] !== "string") {
        throw new BadRequestException(`${field} must be a string`);
      }
      updates[field] = input[field];
    }
    if (input.footerConfig !== undefined) {
      validateFooterConfig(input.footerConfig);
      updates.footerConfig = input.footerConfig;
    }
    if (input.logoType !== undefined) {
      if (typeof input.logoType !== "string") {
        throw new BadRequestException("logoType must be a string");
      }
      updates.logoType = input.logoType === "image" ? "image" : "text";
    }

    const [settings] = await this.database
      .insert(storeSettings)
      .values({ id: "default", ...updates })
      .onConflictDoUpdate({
        target: storeSettings.id,
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();
    if (!settings) throw new Error("Failed to save store settings");
    return serializeSettings(settings);
  }
}

Injectable()(StoreSettingsService);
Inject(DATABASE)(StoreSettingsService, undefined, 0);

export { StoreSettingsService };
