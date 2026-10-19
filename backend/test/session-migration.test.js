import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  normalizeMongoSession,
  validateSessions,
} from "../scripts/import-sessions-to-neon.js";
import { serializeSession, sessionEntries } from "../src/models/Session.js";
import { UsersService } from "../src/users/users.service.js";

test("session storage is normalized and indexed for user activity lookup", () => {
  const table = getTableConfig(sessionEntries);
  assert.equal(table.name, "session_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "user",
      "device",
      "browser",
      "os",
      "ip",
      "location",
      "last_active",
      "is_current",
      "created_at",
      "updated_at",
    ],
  );
  assert.equal(table.indexes.length, 1);
  assert.equal(
    table.indexes[0].config.name,
    "session_entries_user_last_active_idx",
  );
});

test("session serializer exposes the Mongo-compatible _id", () => {
  const row = {
    id: "0123456789abcdef01234567",
    user: "1123456789abcdef01234567",
    isCurrent: true,
  };
  assert.deepEqual(serializeSession(row), { ...row, _id: row.id });
});

test("Mongo session import preserves identity, metadata, and timestamps", () => {
  const session = normalizeMongoSession({
    _id: "0123456789abcdef01234567",
    user: "1123456789abcdef01234567",
    device: "iPhone",
    browser: "Safari",
    os: "iOS",
    ip: "127.0.0.1",
    location: "Dhaka",
    lastActive: new Date(0),
    isCurrent: true,
    createdAt: new Date(1),
    updatedAt: new Date(2),
  });
  assert.equal(session.id, "0123456789abcdef01234567");
  assert.equal(session.user, "1123456789abcdef01234567");
  assert.equal(session.device, "iPhone");
  assert.equal(session.browser, "Safari");
  assert.equal(session.os, "iOS");
  assert.equal(session.location, "Dhaka");
  assert.equal(session.lastActive.getTime(), 0);
  assert.equal(session.isCurrent, true);
  assert.equal(session.updatedAt.getTime(), 2);
});

test("session import rejects invalid identity or invalid timestamp", () => {
  assert.throws(
    () =>
      validateSessions([
        normalizeMongoSession({
          _id: "bad",
          user: "1123456789abcdef01234567",
        }),
      ]),
    /invalid session or user IDs/,
  );
  assert.throws(
    () =>
      normalizeMongoSession({
        _id: "0123456789abcdef01234567",
        user: "1123456789abcdef01234567",
        lastActive: "not-a-date",
      }),
    /invalid date/,
  );
});

test("session listing is limited to the owner and most recent 20", async () => {
  const calls = [];
  const rows = [{ id: "session-id", user: "user-id", isCurrent: true }];
  const database = {
    select() {
      return {
        from(table) {
          calls.push(["from", table]);
          return {
            where(condition) {
              calls.push(["where", condition]);
              return {
                orderBy(column) {
                  calls.push(["orderBy", column]);
                  return {
                    limit: async (limit) => {
                      calls.push(["limit", limit]);
                      return rows;
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

  const result = await new UsersService(database).getSessions("user-id");
  assert.equal(result.sessions[0]._id, "session-id");
  assert.equal(calls[0][1], sessionEntries);
  assert.equal(calls[3][1], 20);
});

test("session revocation only deletes non-current sessions", async () => {
  let deleteCondition;
  const database = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit: async () => [
                  { id: "session-id", user: "user-id", isCurrent: false },
                ],
              };
            },
          };
        },
      };
    },
    delete(table) {
      assert.equal(table, sessionEntries);
      return {
        where(condition) {
          deleteCondition = condition;
          return {
            returning: async () => [{ id: "session-id" }],
          };
        },
      };
    },
  };

  assert.deepEqual(
    await new UsersService(database).revokeSession("user-id", "session-id"),
    { success: true, message: "Session revoked" },
  );
  assert.ok(deleteCondition);
});

test("session revocation rejects the current session without deleting it", async () => {
  let deleted = false;
  const database = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit: async () => [
                  { id: "session-id", user: "user-id", isCurrent: true },
                ],
              };
            },
          };
        },
      };
    },
    delete() {
      deleted = true;
      assert.fail("Current session must not be deleted");
    },
  };

  await assert.rejects(
    new UsersService(database).revokeSession("user-id", "session-id"),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message === "Cannot revoke current session",
  );
  assert.equal(deleted, false);
});

test("new login session clears old current state then creates inside a transaction", async () => {
  const operations = [];
  const transaction = {
    update(table) {
      operations.push(["update", table]);
      return {
        set(values) {
          operations.push(["set", values]);
          return {
            where: async () => operations.push(["where"]),
          };
        },
      };
    },
    insert(table) {
      operations.push(["insert", table]);
      return {
        values: async (values) => operations.push(["values", values]),
      };
    },
  };
  const database = {
    transaction: async (callback) => callback(transaction),
  };

  await new UsersService(database).recordSession("user-id", {
    headers: { "user-agent": "iPhone Safari" },
    ip: "127.0.0.1",
  });
  assert.equal(operations[0][0], "update");
  assert.equal(operations[0][1], sessionEntries);
  assert.equal(operations[1][1].isCurrent, false);
  assert.equal(operations[2][0], "where");
  assert.equal(operations[3][0], "insert");
  assert.equal(operations[4][0], "values");
  assert.equal(operations[4][1].user, "user-id");
  assert.equal(operations[4][1].device, "iPhone");
  assert.equal(operations[4][1].browser, "Safari");
  assert.equal(operations[4][1].isCurrent, true);
});
