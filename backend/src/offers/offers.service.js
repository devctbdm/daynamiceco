import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { cloudinary } from "../middleware/upload.js";
import { offerEntries } from "../models/Offer.js";

class OffersService {
  constructor(database) {
    this.database = database;
  }

  async findAll(activeOnly, requestedLimit) {
    const limit = Number.parseInt(requestedLimit, 10);
    let query = this.database
      .select()
      .from(offerEntries)
      .orderBy(desc(offerEntries.createdAt));

    if (activeOnly) {
      query = query.where(eq(offerEntries.active, true));
    }
    if (limit > 0) {
      query = query.limit(limit);
    }

    return (await query).map(serializeOffer);
  }

  async findBySlug(slug) {
    const [offer] = await this.database
      .select()
      .from(offerEntries)
      .where(eq(offerEntries.slug, slug))
      .limit(1);
    return offer ? serializeOffer(offer) : null;
  }

  async findById(id) {
    const [offer] = await this.database
      .select()
      .from(offerEntries)
      .where(eq(offerEntries.id, id))
      .limit(1);
    return offer ? serializeOffer(offer) : null;
  }

  async create(input, image, userId) {
    const title = normalizeTitle(input?.title);
    const [offer] = await this.database
      .insert(offerEntries)
      .values({
        id: randomBytes(12).toString("hex"),
        title,
        slug: slugify(title) || `offer-${Date.now()}`,
        shortDescription: stringValue(input?.shortDescription),
        fullDescription: stringValue(input?.fullDescription),
        image: image?.path ?? "",
        startDate: normalizeDate(input?.startDate, "startDate"),
        endDate: normalizeDate(input?.endDate, "endDate"),
        active: parseBoolean(input?.active, false),
        createdBy: userId ?? null,
      })
      .returning();

    if (!offer) {
      throw new Error("Failed to create offer");
    }
    return serializeOffer(offer);
  }

  async update(id, input, image) {
    const [existing] = await this.database
      .select()
      .from(offerEntries)
      .where(eq(offerEntries.id, id))
      .limit(1);
    if (!existing) {
      return null;
    }

    const updates = {};
    if (input?.title !== undefined) {
      updates.title = normalizeTitle(input.title);
      updates.slug = slugify(updates.title) || `offer-${Date.now()}`;
    }
    if (input?.shortDescription !== undefined) {
      updates.shortDescription = stringValue(input.shortDescription);
    }
    if (input?.fullDescription !== undefined) {
      updates.fullDescription = stringValue(input.fullDescription);
    }
    if (input?.startDate !== undefined) {
      updates.startDate = normalizeDate(input.startDate, "startDate");
    }
    if (input?.endDate !== undefined) {
      updates.endDate = normalizeDate(input.endDate, "endDate");
    }
    if (input?.active !== undefined) {
      updates.active = parseBoolean(input.active, false);
    }

    const removeImage = parseBoolean(input?.removeImage, false);
    if (image) {
      updates.image = image.path;
    } else if (removeImage) {
      updates.image = "";
    }
    updates.updatedAt = new Date();

    const [offer] = await this.database
      .update(offerEntries)
      .set(updates)
      .where(eq(offerEntries.id, id))
      .returning();
    if (!offer) {
      return null;
    }

    if ((image || removeImage) && existing.image) {
      await deleteCloudinaryImage(existing.image);
    }
    return serializeOffer(offer);
  }

  async delete(id) {
    const [existing] = await this.database
      .select()
      .from(offerEntries)
      .where(eq(offerEntries.id, id))
      .limit(1);
    if (!existing) {
      return false;
    }

    await deleteCloudinaryImage(existing.image);
    const [deleted] = await this.database
      .delete(offerEntries)
      .where(eq(offerEntries.id, id))
      .returning({ id: offerEntries.id });
    return Boolean(deleted);
  }
}

function normalizeTitle(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException({
      success: false,
      message: "Title is required",
    });
  }
  return value.trim();
}

function normalizeDate(value, field) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw invalidDate(field);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw invalidDate(field);
  }
  return date;
}

function invalidDate(field) {
  return new BadRequestException({
    success: false,
    message: `Invalid ${field}`,
  });
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return value === true || value === "true";
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function serializeOffer(offer) {
  return {
    _id: offer.id,
    title: offer.title,
    slug: offer.slug,
    shortDescription: offer.shortDescription,
    fullDescription: offer.fullDescription,
    image: offer.image,
    startDate: offer.startDate,
    endDate: offer.endDate,
    active: offer.active,
    createdBy: offer.createdBy,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

async function deleteCloudinaryImage(imageUrl) {
  const publicId = cloudinaryPublicId(imageUrl);
  if (!publicId) {
    return;
  }

  let result;
  try {
    result = await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new ServiceUnavailableException(
      {
        success: false,
        message: "Failed to remove offer image from Cloudinary",
      },
      { cause: error },
    );
  }
  if (!["ok", "not found"].includes(result?.result)) {
    throw new ServiceUnavailableException({
      success: false,
      message: "Cloudinary did not confirm offer image removal",
    });
  }
}

function cloudinaryPublicId(imageUrl) {
  if (!imageUrl) return null;
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
      segment === "apple-it-zone" && segments[index + 1] === "offers",
  );
  if (folderIndex < 0) return null;

  const assetPath = segments.slice(folderIndex).join("/");
  return assetPath.replace(/\.[^.]+$/, "") || null;
}

Injectable()(OffersService);
Inject(DATABASE)(OffersService, undefined, 0);

export { OffersService, cloudinaryPublicId };
