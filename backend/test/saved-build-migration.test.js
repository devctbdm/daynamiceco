import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  normalizeMongoSavedBuild,
  validateSavedBuilds,
} from "../scripts/import-saved-builds-to-neon.js";
import { productEntries } from "../src/models/Product.js";
import {
  savedBuildEntries,
  serializeSavedBuild,
} from "../src/models/SavedBuild.js";
import { SavedBuildsService } from "../src/saved-builds/saved-builds.service.js";

test("saved build table indexes user build history and keeps component JSON", () => {
  const table = getTableConfig(savedBuildEntries);
  assert.equal(table.name, "saved_build_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    ["id", "user_id", "name", "components", "created_at", "updated_at"],
  );
  assert.equal(
    table.indexes[0].config.name,
    "saved_build_entries_user_created_at_idx",
  );
  assert.equal(
    table.indexes[0].config.columns.map((column) => column.name).join(","),
    "user_id,created_at",
  );
});

test("saved build serializer preserves legacy user and document ID fields", () => {
  const build = serializeSavedBuild({
    id: "build-id",
    userId: "user-id",
    name: "My build",
    components: {},
  });
  assert.equal(build._id, "build-id");
  assert.equal(build.user, "user-id");
  assert.equal(build.name, "My build");
  assert.equal("userId" in build, false);
});

test("saved build listing is user-scoped, newest-first, and capped at 100", async () => {
  const calls = [];
  const database = {
    select() {
      return {
        from(table) {
          assert.equal(table, savedBuildEntries);
          return {
            where(condition) {
              calls.push(["where", condition]);
              return {
                orderBy(order) {
                  calls.push(["orderBy", order]);
                  return {
                    limit: async (limit) => {
                      calls.push(["limit", limit]);
                      return [
                        {
                          id: "build-id",
                          userId: "user-id",
                          components: {},
                        },
                      ];
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  const builds = await new SavedBuildsService(database).getMyBuilds("user-id");
  assert.equal(builds[0]._id, "build-id");
  assert.equal(builds[0].user, "user-id");
  assert.equal(calls[0][0], "where");
  assert.equal(calls[1][0], "orderBy");
  assert.deepEqual(calls[2], ["limit", 100]);
});

test("saving a build uses Neon product values and drops unknown products", async () => {
  const product = {
    id: "507f1f77bcf86cd799439011",
    name: "Graphics card",
    slug: "graphics-card",
    description: "",
    price: 1000,
    discountPrice: 800,
    category: "GPU",
    images: ["gpu.webp"],
    createdBy: "admin",
    pcPart: { wattage: 250 },
  };
  let inserted;
  const database = {
    select() {
      return {
        from(table) {
          assert.equal(table, productEntries);
          return {
            where: async () => [product],
          };
        },
      };
    },
    insert(table) {
      assert.equal(table, savedBuildEntries);
      return {
        values(values) {
          inserted = values;
          return { returning: async () => [values] };
        },
      };
    },
  };
  const build = await new SavedBuildsService(database).saveBuild("user-id", {
    name: "  Gaming rig  ",
    components: {
      gpu: {
        product: "507f1f77bcf86cd799439011",
        name: "Forged name",
        image: "forged.webp",
        price: 1,
        wattage: 1,
      },
      cpu: { product: "missing-product" },
      memory: null,
    },
  });
  assert.match(inserted.id, /^[\da-f-]{36}$/i);
  assert.equal(inserted.userId, "user-id");
  assert.equal(inserted.name, "Gaming rig");
  assert.deepEqual(inserted.components, {
    gpu: {
      product: "507f1f77bcf86cd799439011",
      name: "Graphics card",
      image: "gpu.webp",
      price: 800,
      wattage: 250,
    },
  });
  assert.deepEqual(build.components, inserted.components);
  assert.equal(build.user, "user-id");
});

test("save requires components and rejects overlong names", async () => {
  const service = new SavedBuildsService({});
  await assert.rejects(
    service.saveBuild("user-id", {}),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message === "components are required",
  );
  await assert.rejects(
    service.saveBuild("user-id", {
      name: "x".repeat(81),
      components: {},
    }),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message ===
        "Build name cannot be more than 80 characters",
  );
});

test("deleting a saved build scopes deletion to its owner", async () => {
  let condition;
  const database = {
    delete(table) {
      assert.equal(table, savedBuildEntries);
      return {
        where(whereCondition) {
          condition = whereCondition;
          return {
            returning: async () => [],
          };
        },
      };
    },
  };
  await assert.rejects(
    new SavedBuildsService(database).deleteBuild("user-id", "build-id"),
    (error) =>
      error instanceof NotFoundException &&
      error.getResponse().message === "Build not found",
  );
  assert.ok(condition);
});

test("saved build importer normalizes records and rejects invalid IDs", () => {
  const build = normalizeMongoSavedBuild({
    _id: "507f1f77bcf86cd799439011",
    user: "507f191e810c19729de860ea",
    name: " Gaming PC ",
    components: { gpu: { product: "507f1f77bcf86cd799439099" } },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });
  validateSavedBuilds([build]);
  assert.equal(build.name, "Gaming PC");
  assert.deepEqual(build.components.gpu.product, "507f1f77bcf86cd799439099");
  assert.throws(
    () => validateSavedBuilds([{ ...build, userId: "invalid" }]),
    /are invalid/,
  );
  assert.throws(
    () => validateSavedBuilds([{ ...build, name: "x".repeat(81) }]),
    /are invalid/,
  );
});
