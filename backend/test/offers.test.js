import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { offerEntries } from "../src/models/Offer.js";
import {
  cloudinaryPublicId,
  OffersService,
} from "../src/offers/offers.service.js";

test("offers use a normalized PostgreSQL table with unique slugs", () => {
  const config = getTableConfig(offerEntries);

  assert.equal(config.name, "offer_entries");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [
      "id",
      "title",
      "slug",
      "short_description",
      "full_description",
      "image",
      "start_date",
      "end_date",
      "active",
      "created_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(config.columns[0].primary, true);
  assert.equal(
    config.indexes.find(
      (index) => index.config.name === "offer_entries_slug_unique",
    ).config.unique,
    true,
  );
});

test("offer list filters active records and applies a positive limit", async () => {
  const rows = [offerRow()];
  let where;
  let limit;
  const query = {
    from: () => query,
    orderBy: () => query,
    where(condition) {
      where = condition;
      return query;
    },
    limit(value) {
      limit = value;
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
  const service = new OffersService({ select: () => query });

  assert.deepEqual(await service.findAll(true, "5"), [
    serializeExpected(rows[0]),
  ]);
  assert.ok(where);
  assert.equal(limit, 5);
});

test("offer create trims title, generates slug and ObjectId-shaped id", async () => {
  let values;
  const service = new OffersService({
    insert(table) {
      assert.equal(table, offerEntries);
      return {
        values(input) {
          values = input;
          return this;
        },
        returning: async () => [
          offerRow({
            ...values,
            id: values.id,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          }),
        ],
      };
    },
  });

  const offer = await service.create(
    {
      title: "  Summer Tech Splash ",
      shortDescription: "One-line summary",
      fullDescription: "<p>Details</p>",
      startDate: "2026-06-01",
      endDate: "",
      active: "true",
    },
    { path: "https://images.example/offer.webp" },
    "admin-id",
  );

  assert.equal(values.title, "Summer Tech Splash");
  assert.equal(values.slug, "summer-tech-splash");
  assert.equal(values.startDate.toISOString(), "2026-06-01T00:00:00.000Z");
  assert.equal(values.endDate, null);
  assert.equal(values.active, true);
  assert.equal(values.createdBy, "admin-id");
  assert.equal(offer._id, values.id);
  assert.match(offer._id, /^[a-f\d]{24}$/);
});

test("offer create rejects blank titles and invalid dates", async () => {
  const service = new OffersService({
    insert: () => ({
      values: () => ({
        returning: async () => [],
      }),
    }),
  });

  await assert.rejects(
    service.create({ title: " " }),
    (error) => error.getStatus() === 400,
  );
  await assert.rejects(
    service.create({ title: "Valid", startDate: "invalid" }),
    (error) => error.getStatus() === 400,
  );
});

test("offer update preserves omitted fields and regenerates slug when title changes", async () => {
  let update;
  const current = offerRow();
  const updated = offerRow({
    ...current,
    title: "New Title",
    slug: "new-title",
    active: false,
  });
  let selectCalls = 0;
  const service = new OffersService({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (++selectCalls === 1 ? [current] : []),
        }),
      }),
    }),
    update(table) {
      assert.equal(table, offerEntries);
      return {
        set(values) {
          update = values;
          return this;
        },
        where() {
          return { returning: async () => [updated] };
        },
      };
    },
  });

  const offer = await service.update(current.id, {
    title: "New Title",
    active: "false",
  });

  assert.equal(offer.title, "New Title");
  assert.equal(update.slug, "new-title");
  assert.equal(update.active, false);
  assert.equal("shortDescription" in update, false);
  assert.ok(update.updatedAt instanceof Date);
});

test("offer delete returns false for missing rows and deletes matching rows", async () => {
  let selected = [];
  let deletedTable;
  let condition;
  const service = new OffersService({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => selected }),
      }),
    }),
    delete(table) {
      deletedTable = table;
      return {
        where: (where) => {
          condition = where;
          return { returning: async () => [{ id: "offer-id" }] };
        },
      };
    },
  });

  assert.equal(await service.delete("missing"), false);
  selected = [offerRow({ image: "" })];
  assert.equal(await service.delete("offer-id"), true);
  assert.equal(deletedTable, offerEntries);
  assert.ok(condition);
});

test("Cloudinary offer image URLs resolve only to the offers folder", () => {
  assert.equal(
    cloudinaryPublicId(
      "https://res.cloudinary.com/example/image/upload/v123/apple-it-zone/offers/offer-1.jpg",
    ),
    "apple-it-zone/offers/offer-1",
  );
  assert.equal(
    cloudinaryPublicId(
      "https://res.cloudinary.com/example/image/upload/v123/other/folder/file.jpg",
    ),
    null,
  );
  assert.equal(cloudinaryPublicId("https://images.example/file.jpg"), null);
  assert.equal(
    cloudinaryPublicId(
      "https://cloudinary.com.attacker.example/image/upload/v123/apple-it-zone/offers/file.jpg",
    ),
    null,
  );
});

function offerRow(overrides = {}) {
  return {
    id: "0123456789abcdef01234567",
    title: "Summer Tech Splash",
    slug: "summer-tech-splash",
    shortDescription: "",
    fullDescription: "",
    image: "",
    startDate: null,
    endDate: null,
    active: true,
    createdBy: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

function serializeExpected(offer) {
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
