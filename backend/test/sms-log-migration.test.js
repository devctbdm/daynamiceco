import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  normalizeMongoSmsLog,
  validateSmsLogs,
} from "../scripts/import-sms-logs-to-neon.js";
import { serializeSmsLog, smsLogEntries } from "../src/models/SmsLog.js";
import {
  createSmsLog,
  listSmsLogs,
} from "../src/sms-logs/sms-logs.repository.js";

test("SMS log table stores all legacy fields with ordered history index", () => {
  const table = getTableConfig(smsLogEntries);
  assert.equal(table.name, "sms_log_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "recipients",
      "message",
      "segments",
      "status",
      "provider_status",
      "provider_message",
      "error_code",
      "raw",
      "sent_by",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(table.indexes[0].config.name, "sms_log_entries_created_at_idx");
  assert.equal(table.checks.length, 1);
});

test("SMS log serializer preserves the legacy to field and document ID", () => {
  const log = serializeSmsLog({
    id: "log-id",
    recipients: ["8801712345678"],
    message: "Hello",
  });
  assert.equal(log.id, "log-id");
  assert.equal(log._id, "log-id");
  assert.deepEqual(log.to, ["8801712345678"]);
  assert.equal("recipients" in log, false);
});

test("SMS log repository creates a serializable Neon log", async () => {
  let inserted;
  const database = {
    insert(table) {
      assert.equal(table, smsLogEntries);
      return {
        values(values) {
          inserted = values;
          return {
            returning: async () => [values],
          };
        },
      };
    },
  };
  const log = await createSmsLog(
    {
      to: ["8801712345678"],
      message: "Hello",
      segments: 1,
      status: "sent",
      raw: { response_code: 202 },
    },
    database,
  );
  assert.match(inserted.id, /^[\da-f-]{36}$/i);
  assert.deepEqual(inserted.recipients, ["8801712345678"]);
  assert.deepEqual(log.to, ["8801712345678"]);
  assert.equal(log.status, "sent");
  assert.deepEqual(log.raw, { response_code: 202 });
  assert.ok(log.createdAt instanceof Date);
});

test("SMS log repository paginates history in descending timestamp order", async () => {
  const calls = [];
  const logRow = {
    id: "log-id",
    recipients: ["8801712345678"],
    message: "Hello",
  };
  const database = {
    select(selection) {
      if (selection) {
        calls.push(["count", selection]);
        return {
          from: async (table) => {
            assert.equal(table, smsLogEntries);
            return [{ total: 3 }];
          },
        };
      }
      return {
        from(table) {
          assert.equal(table, smsLogEntries);
          return {
            orderBy(order) {
              calls.push(["orderBy", order]);
              return {
                limit(limit) {
                  calls.push(["limit", limit]);
                  return {
                    offset: async (offset) => {
                      calls.push(["offset", offset]);
                      return [logRow];
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
  const result = await listSmsLogs({ page: 2, limit: 15 }, database);
  assert.equal(result.total, 3);
  assert.equal(result.logs[0]._id, "log-id");
  assert.deepEqual(result.logs[0].to, ["8801712345678"]);
  assert.deepEqual(
    calls.filter(([name]) => name === "limit" || name === "offset"),
    [
      ["limit", 15],
      ["offset", 15],
    ],
  );
});

test("SMS log importer preserves records and validates IDs and required fields", () => {
  const log = normalizeMongoSmsLog({
    _id: "507f1f77bcf86cd799439011",
    to: ["8801712345678"],
    message: "Hello",
    segments: 2,
    status: "failed",
    providerStatus: "500",
    providerMessage: "Provider failure",
    errorCode: "500",
    raw: { response_code: 500 },
    sentBy: "507f191e810c19729de860ea",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });
  validateSmsLogs([log]);
  assert.equal(log.id, "507f1f77bcf86cd799439011");
  assert.equal(log.segments, 2);
  assert.equal(log.status, "failed");
  assert.deepEqual(log.raw, { response_code: 500 });
  assert.equal(log.sentBy, "507f191e810c19729de860ea");
  assert.throws(
    () => validateSmsLogs([{ ...log, id: "invalid-id" }]),
    /are invalid/,
  );
  assert.throws(
    () => validateSmsLogs([{ ...log, recipients: [] }]),
    /are invalid/,
  );
});
