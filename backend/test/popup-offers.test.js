import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { popupOfferSettings } from "../src/models/PopupOffer.js";
import {
  cloudinaryPublicId,
  PopupOffersService,
  toResponse,
} from "../src/popup-offers/popup-offers.service.js";

test("popup offer settings use normalized columns and bounded defaults", () => {
  const table = getTableConfig(popupOfferSettings);
  assert.equal(table.name, "popup_offer_settings");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "image",
      "enabled",
      "delay_seconds",
      "max_shows_per_day",
      "updated_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(table.columns[0].default, "default");
  assert.equal(table.columns[1].default, "");
  assert.equal(table.columns[2].default, false);
  assert.equal(table.columns[3].default, 30);
  assert.equal(table.columns[4].default, 1);
  assert.equal(table.checks.length, 2);
});

test("popup offer response preserves the legacy field shape and defaults", () => {
  assert.deepEqual(toResponse(null), {
    _id: null,
    image: "",
    enabled: false,
    delaySeconds: 30,
    maxShowsPerDay: 1,
    createdAt: null,
    updatedAt: null,
  });
  assert.deepEqual(
    toResponse({
      id: "default",
      image: "https://res.cloudinary.com/demo/image/upload/a.jpg",
      enabled: true,
      delaySeconds: 60,
      maxShowsPerDay: 2,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    }),
    {
      _id: "default",
      image: "https://res.cloudinary.com/demo/image/upload/a.jpg",
      enabled: true,
      delaySeconds: 60,
      maxShowsPerDay: 2,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
  );
});

test("popup offer delay and frequency validation reject values before writes", async () => {
  const service = new PopupOffersService({
    select() {
      assert.fail("Invalid values must not query the database");
    },
  });

  await assert.rejects(
    service.update({ delaySeconds: "29", maxShowsPerDay: "1" }),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        "Popup delay must be between 30 seconds and 5 minutes",
      );
      return true;
    },
  );
  await assert.rejects(
    service.update({ delaySeconds: "30", maxShowsPerDay: "4" }),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        "Popup frequency must be between 1 and 3 times per day",
      );
      return true;
    },
  );
});

test("popup offer update upserts normalized values and preserves the legacy flag behavior", async () => {
  let inserted;
  let conflictUpdate;
  const database = {
    select() {
      return {
        from() {
          return this;
        },
        where() {
          return this;
        },
        async limit() {
          return [];
        },
      };
    },
    insert() {
      return {
        values(value) {
          inserted = value;
          return this;
        },
        onConflictDoUpdate(value) {
          conflictUpdate = value;
          return this;
        },
        async returning() {
          return [
            {
              ...inserted,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            },
          ];
        },
      };
    },
  };

  const response = await new PopupOffersService(database).update(
    {
      enabled: "1",
      delaySeconds: "60",
      maxShowsPerDay: "2",
    },
    undefined,
    "admin-id",
  );

  assert.equal(inserted.id, "default");
  assert.equal(inserted.enabled, false);
  assert.equal(inserted.delaySeconds, 60);
  assert.equal(inserted.maxShowsPerDay, 2);
  assert.equal(inserted.updatedBy, "admin-id");
  assert.deepEqual(conflictUpdate.set, {
    enabled: false,
    delaySeconds: 60,
    maxShowsPerDay: 2,
    updatedBy: "admin-id",
    updatedAt: inserted.updatedAt,
  });
  assert.equal(response._id, "default");
  assert.equal(response.enabled, false);
});

test("Cloudinary cleanup only accepts popup assets from the configured folder", () => {
  assert.equal(
    cloudinaryPublicId(
      "https://res.cloudinary.com/demo/image/upload/v123/apple-it-zone/popup-offers/popup-1.webp",
    ),
    "apple-it-zone/popup-offers/popup-1",
  );
  assert.equal(
    cloudinaryPublicId(
      "https://res.cloudinary.com/demo/image/upload/v123/apple-it-zone/offers/offer-1.webp",
    ),
    null,
  );
  assert.equal(
    cloudinaryPublicId("https://example.com/apple-it-zone/popup-offers/image"),
    null,
  );
});
