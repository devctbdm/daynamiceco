import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { maintenanceSetting } from "../src/models/MaintenanceSetting.js";
import {
  MaintenanceService,
  MaintenanceSuperAdminGuard,
} from "../src/maintenance/maintenance.service.js";

test("maintenance configuration uses a dedicated normalized singleton table", () => {
  const config = getTableConfig(maintenanceSetting);

  assert.equal(config.name, "maintenance_config");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    [
      "id",
      "enabled",
      "message",
      "end_at",
      "contact_email",
      "contact_phone",
      "selling_enabled",
      "selling_message",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(config.columns[0].primary, true);
  assert.equal(config.columns[1].default, false);
  assert.equal(config.columns[6].default, true);
});

test("maintenance read inserts the default row and returns public field defaults", async () => {
  const calls = [];
  const database = {
    insert(table) {
      calls.push(["insert", table]);
      return {
        values: (values) => {
          calls.push(["values", values]);
          return {
            onConflictDoNothing: () => Promise.resolve(),
          };
        },
      };
    },
    select: () => ({
      from: (table) => {
        calls.push(["from", table]);
        return {
          where: () => ({
            limit: async () => [
              {
                enabled: false,
                message: "",
                endAt: null,
                contactEmail: "",
                contactPhone: "",
                sellingEnabled: true,
                sellingMessage: "",
                updatedAt: new Date(0),
              },
            ],
          }),
        };
      },
    }),
  };

  assert.deepEqual(await new MaintenanceService(database).getSetting(), {
    enabled: false,
    message: "",
    endAt: null,
    contactEmail: "",
    contactPhone: "",
    sellingEnabled: true,
    sellingMessage: "",
    updatedAt: new Date(0).toISOString(),
  });
  assert.deepEqual(calls[1][1], { id: "default" });
  assert.equal(calls[2][1], maintenanceSetting);
});

test("maintenance update normalizes supplied fields and leaves omitted values unchanged", async () => {
  let values;
  let update;
  const saved = {
    enabled: true,
    message: "Planned maintenance",
    endAt: new Date("2026-10-20T12:00:00.000Z"),
    contactEmail: "",
    contactPhone: "",
    sellingEnabled: false,
    sellingMessage: "Ordering paused",
    updatedAt: new Date("2026-10-18T12:00:00.000Z"),
  };
  const database = {
    insert(table) {
      assert.equal(table, maintenanceSetting);
      return {
        values(row) {
          values = row;
          return this;
        },
        onConflictDoUpdate(config) {
          update = config;
          return this;
        },
        returning: async () => [saved],
      };
    },
  };

  assert.deepEqual(
    await new MaintenanceService(database).updateSetting({
      enabled: true,
      message: "  Planned maintenance ",
      endAt: "2026-10-20T12:00:00.000Z",
      sellingEnabled: false,
      sellingMessage: " Ordering paused ",
      ignored: "value",
    }),
    {
      enabled: true,
      message: "Planned maintenance",
      endAt: saved.endAt.toISOString(),
      contactEmail: "",
      contactPhone: "",
      sellingEnabled: false,
      sellingMessage: "Ordering paused",
      updatedAt: saved.updatedAt.toISOString(),
    },
  );
  assert.equal(values.id, "default");
  assert.equal(values.message, "Planned maintenance");
  assert.equal(values.endAt.toISOString(), saved.endAt.toISOString());
  assert.equal("ignored" in values, false);
  assert.ok(update.set.updatedAt instanceof Date);
  assert.equal("contactEmail" in update.set, false);
});

test("maintenance update can clear end date and rejects invalid end dates", async () => {
  let insertValues;
  const service = new MaintenanceService({
    insert: () => ({
      values(values) {
        insertValues = values;
        return this;
      },
      onConflictDoUpdate() {
        return this;
      },
      returning: async () => [
        {
          ...valuesToRow(insertValues),
          updatedAt: new Date(0),
        },
      ],
    }),
  });

  await service.updateSetting({ endAt: "" });
  assert.equal(insertValues.endAt, null);
  await assert.rejects(service.updateSetting({ endAt: "not a date" }), {
    status: 400,
  });
});

test("maintenance super-admin guard requires the super_admin role", async () => {
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: "admin" } }),
    }),
  };
  const guard = new MaintenanceSuperAdminGuard({
    canActivate: async () => true,
  });

  await assert.rejects(guard.canActivate(context), {
    status: 403,
  });
  assert.equal(
    await new MaintenanceSuperAdminGuard({
      canActivate: async () => true,
    }).canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: "super_admin" } }),
      }),
    }),
    true,
  );
});

function valuesToRow(values) {
  return {
    enabled: false,
    message: "",
    endAt: values.endAt ?? null,
    contactEmail: "",
    contactPhone: "",
    sellingEnabled: true,
    sellingMessage: "",
  };
}
