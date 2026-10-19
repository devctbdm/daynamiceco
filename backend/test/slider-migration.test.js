import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { sliderEntries, serializeSlider } from "../src/models/Slider.js";
import {
  serializeSliderSetting,
  sliderSettingEntries,
} from "../src/models/SliderSetting.js";
import { SlidersService } from "../src/sliders/sliders.service.js";
import {
  normalizeMongoSlider,
  normalizeMongoSliderSetting,
} from "../scripts/import-sliders-to-neon.js";

test("slider schema preserves legacy fields, indexes, and validation", () => {
  const table = getTableConfig(sliderEntries);
  assert.equal(table.name, "slider_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "title",
      "description",
      "image",
      "link",
      "type",
      "active",
      "sort_order",
      "created_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(table.indexes.length, 2);
  assert.equal(table.checks.length, 4);
});

test("slider settings use a constrained Neon singleton", () => {
  const table = getTableConfig(sliderSettingEntries);
  assert.equal(table.name, "slider_setting_entries");
  assert.equal(table.columns[0].default, "default");
  assert.equal(
    table.columns.find((column) => column.name === "auto_slide").default,
    true,
  );
  assert.equal(
    table.columns.find((column) => column.name === "interval").default,
    5,
  );
  assert.equal(table.checks.length, 2);
});

test("slider serialization preserves the Mongo _id alias", () => {
  const slider = serializeSlider({ id: "slide-id", title: "Slide" });
  assert.equal(slider.id, "slide-id");
  assert.equal(slider._id, "slide-id");
});

test("Mongo slider import preserves IDs, creator references, and dates", () => {
  const slider = normalizeMongoSlider({
    _id: "0123456789abcdef01234567",
    title: "  Hero  ",
    description: "  Message ",
    image: "https://example.com/hero.jpg",
    link: " /products ",
    type: "hero",
    active: false,
    sortOrder: 3,
    createdBy: "abcdefabcdefabcdefabcdef",
    createdAt: new Date(0),
  });
  assert.equal(slider.id, "0123456789abcdef01234567");
  assert.equal(slider.title, "Hero");
  assert.equal(slider.description, "Message");
  assert.equal(slider.link, "/products");
  assert.equal(slider.active, false);
  assert.equal(slider.sortOrder, 3);
  assert.equal(slider.createdBy, "abcdefabcdefabcdefabcdef");
  assert.equal(slider.createdAt.getTime(), 0);
});

test("slider setting import keeps current autoplay values", () => {
  assert.deepEqual(
    normalizeMongoSliderSetting({
      enabled: false,
      autoSlide: true,
      interval: "7",
    }),
    { enabled: false, autoSlide: true, interval: 7 },
  );
  assert.throws(
    () =>
      normalizeMongoSliderSetting({
        enabled: true,
        autoSlide: true,
        interval: 11,
      }),
    /do not satisfy Neon constraints/,
  );
});

test("slider create validates fields before using the database", async () => {
  const service = new SlidersService({});
  await assert.rejects(service.create({ type: "unexpected" }), { status: 400 });
  await assert.rejects(service.create({ title: "x".repeat(201) }), {
    status: 400,
  });
  await assert.rejects(service.create({ sortOrder: -1 }), { status: 400 });
});

test("slider creation stores normalized fields and returns compatible IDs", async () => {
  let inserted;
  const database = {
    insert(table) {
      assert.equal(table, sliderEntries);
      return {
        values(values) {
          inserted = values;
          return this;
        },
        returning: async () => [
          {
            ...inserted,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          },
        ],
      };
    },
  };
  const created = await new SlidersService(database).create(
    {
      title: "  Hero slide ",
      description: " Promo ",
      link: " /offers ",
      type: "ad_top",
      sortOrder: "2.5",
    },
    { path: "https://cloudinary.com/slider.jpg" },
    "creator-id",
  );
  assert.equal(inserted.title, "Hero slide");
  assert.equal(inserted.description, "Promo");
  assert.equal(inserted.image, "https://cloudinary.com/slider.jpg");
  assert.equal(inserted.link, "/offers");
  assert.equal(inserted.type, "ad_top");
  assert.equal(inserted.sortOrder, 2.5);
  assert.equal(inserted.createdBy, "creator-id");
  assert.match(created._id, /^[a-f\d]{24}$/);
});

test("slider setting updates preserve omitted values", async () => {
  const setting = {
    id: "default",
    enabled: false,
    autoSlide: true,
    interval: 5,
  };
  let updates;
  const database = {
    insert() {
      return {
        values() {
          return {
            onConflictDoNothing: async () => {},
          };
        },
      };
    },
    select() {
      return {
        from() {
          return {
            where() {
              return { limit: async () => [setting] };
            },
          };
        },
      };
    },
    update() {
      return {
        set(values) {
          updates = values;
          return {
            where() {
              return {
                returning: async () => [{ ...setting, ...values }],
              };
            },
          };
        },
      };
    },
  };

  assert.deepEqual(
    await new SlidersService(database).updateSetting({ interval: "8" }),
    { enabled: false, autoSlide: true, interval: 8 },
  );
  assert.equal(updates.interval, 8);
  assert.ok(updates.updatedAt instanceof Date);
  assert.equal("enabled" in updates, false);
});

test("slider reorder validates the complete request before database access", async () => {
  const service = new SlidersService({});
  await assert.rejects(service.reorder({}), { status: 400 });
  await assert.rejects(service.reorder([{ id: "slide-id", sortOrder: -1 }]), {
    status: 400,
  });
});

test("slider setting serializer exposes legacy fields and ID", () => {
  const setting = serializeSliderSetting({
    id: "default",
    enabled: true,
    autoSlide: false,
    interval: 6,
  });
  assert.equal(setting._id, "default");
  assert.equal(setting.autoSlide, false);
});
