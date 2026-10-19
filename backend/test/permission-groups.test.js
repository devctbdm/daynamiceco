import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { permissionGroupEntries } from "../src/models/PermissionGroup.js";
import {
  findPermissionGroupById,
  serializePermissionGroup,
} from "../src/permission-groups/permission-groups.repository.js";
import { validatePermissions } from "../src/permission-groups/permission-groups.service.js";
import { resolvePermissions } from "../src/utils/permissions.js";

test("permission group table stores normalized fields and enforces name and JSON checks", () => {
  const config = getTableConfig(permissionGroupEntries);

  assert.equal(config.name, "permission_group_entries");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [
      "id",
      "name",
      "description",
      "color",
      "permissions",
      "created_by",
      "updated_by",
      "active",
      "created_at",
      "updated_at",
    ],
  );
  assert.ok(
    config.indexes.some(
      (index) =>
        index.config.name === "permission_group_entries_name_unique" &&
        index.config.unique,
    ),
  );
  assert.deepEqual(config.checks.map((check) => check.name).sort(), [
    "permission_group_entries_description_length_check",
    "permission_group_entries_name_length_check",
    "permission_group_entries_permissions_array_check",
  ]);
});

test("permission group serialization retains Mongo-compatible _id", () => {
  const createdAt = new Date(0);
  const group = serializePermissionGroup({
    id: "0123456789abcdef01234567",
    name: "Managers",
    permissions: [],
    createdAt,
  });

  assert.equal(group._id, group.id);
  assert.equal(group.createdAt, createdAt);
});

test("staff permission-group lookup reads the normalized Neon table", async () => {
  const row = {
    id: "0123456789abcdef01234567",
    name: "Managers",
    permissions: [{ module: "orders", view: true }],
  };
  const database = {
    select() {
      return {
        from(table) {
          assert.equal(table, permissionGroupEntries);
          return {
            where() {
              return {
                limit: async (count) => {
                  assert.equal(count, 1);
                  return [row];
                },
              };
            },
          };
        },
      };
    },
  };

  assert.deepEqual(await findPermissionGroupById(row.id, database), {
    ...row,
    _id: row.id,
  });
});

test("permission validation rejects unknown modules and actions", () => {
  assert.throws(
    () => validatePermissions([{ module: "unknown", view: true }]),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().message, 'Unknown module: "unknown"');
      return true;
    },
  );
  assert.throws(
    () => validatePermissions([{ module: "orders", approve: true }]),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        'Unknown action "approve" on module "orders"',
      );
      return true;
    },
  );
});

test("permission validation fills omitted action flags with false", () => {
  assert.deepEqual(validatePermissions([{ module: "orders", view: true }]), [
    {
      module: "orders",
      view: true,
      create: false,
      edit: false,
      delete: false,
      manage: false,
      export: false,
    },
  ]);
});

test("permission resolution honors the Neon-backed permission group", () => {
  const groupPermissions = [{ module: "orders", view: true, manage: false }];
  assert.deepEqual(
    resolvePermissions(
      { role: "manager", customPermissions: [] },
      { permissions: groupPermissions },
    ),
    groupPermissions,
  );
});
