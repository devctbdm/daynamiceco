import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE } from "../db/database.js";
import { popupOfferSettings } from "../models/PopupOffer.js";
import { cloudinary } from "../middleware/upload.js";

class PopupOffersService {
  constructor(database) {
    this.database = database;
  }

  async get() {
    const [popupOffer] = await this.database
      .select()
      .from(popupOfferSettings)
      .where(eq(popupOfferSettings.id, "default"))
      .limit(1);
    return toResponse(popupOffer);
  }

  async update(input, image, userId) {
    const delaySeconds = Number(input?.delaySeconds);
    const maxShowsPerDay = Number(input?.maxShowsPerDay);
    if (
      !Number.isInteger(delaySeconds) ||
      delaySeconds < 30 ||
      delaySeconds > 300
    ) {
      throw new BadRequestException({
        success: false,
        message: "Popup delay must be between 30 seconds and 5 minutes",
      });
    }
    if (
      !Number.isInteger(maxShowsPerDay) ||
      maxShowsPerDay < 1 ||
      maxShowsPerDay > 3
    ) {
      throw new BadRequestException({
        success: false,
        message: "Popup frequency must be between 1 and 3 times per day",
      });
    }

    const [existing] = await this.database
      .select()
      .from(popupOfferSettings)
      .where(eq(popupOfferSettings.id, "default"))
      .limit(1);
    const updates = {
      enabled: input?.enabled === "true" || input?.enabled === true,
      delaySeconds,
      maxShowsPerDay,
      updatedBy: userId ? String(userId) : null,
      updatedAt: new Date(),
    };

    if (image?.path) {
      updates.image = image.path;
    } else if (input?.removeImage === "true") {
      updates.image = "";
      updates.enabled = false;
    }

    const [saved] = await this.database
      .insert(popupOfferSettings)
      .values({ id: "default", ...updates })
      .onConflictDoUpdate({
        target: popupOfferSettings.id,
        set: updates,
      })
      .returning();
    if (!saved) throw new Error("Failed to save popup offer settings");

    if (
      existing?.image &&
      existing.image !== saved.image &&
      (image?.path || input?.removeImage === "true")
    ) {
      await deleteCloudinaryImage(existing.image);
    }

    return toResponse(saved);
  }
}

function toResponse(popupOffer) {
  return {
    _id: popupOffer?.id || null,
    image: popupOffer?.image || "",
    enabled: popupOffer?.enabled ?? false,
    delaySeconds: popupOffer?.delaySeconds ?? 30,
    maxShowsPerDay: popupOffer?.maxShowsPerDay ?? 1,
    createdAt: popupOffer?.createdAt || null,
    updatedAt: popupOffer?.updatedAt || null,
  };
}

async function deleteCloudinaryImage(imageUrl) {
  const publicId = cloudinaryPublicId(imageUrl);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.warn("Could not delete old popup offer image:", error.message);
  }
}

function cloudinaryPublicId(imageUrl) {
  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (
    url.hostname !== "cloudinary.com" &&
    !url.hostname.endsWith(".cloudinary.com")
  ) {
    return null;
  }
  const uploadPath = url.pathname.split("/image/upload/")[1];
  if (!uploadPath) return null;
  const segments = uploadPath.split("/");
  const folderIndex = segments.findIndex(
    (segment, index) =>
      segment === "apple-it-zone" && segments[index + 1] === "popup-offers",
  );
  if (folderIndex < 0) return null;
  return segments
    .slice(folderIndex)
    .join("/")
    .replace(/\.[^.]+$/, "");
}

Injectable()(PopupOffersService);
Inject(DATABASE)(PopupOffersService, undefined, 0);

export { PopupOffersService, cloudinaryPublicId, toResponse };
