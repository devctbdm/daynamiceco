import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { PgDialect } from "drizzle-orm/pg-core";
import { NotificationsController } from "../src/notifications/notifications.controller.js";
import { notificationEntries } from "../src/models/Notification.js";
import { listCustomerNotificationEntries } from "../src/notifications/notifications.repository.js";

test("customer notification queries are scoped to the authenticated customer", async () => {
  const dialect = new PgDialect();
  const conditions = [];
  const database = {
    select(selection) {
      if (selection) {
        return {
          from(table) {
            assert.equal(table, notificationEntries);
            return {
              where: async (condition) => {
                conditions.push(dialect.sqlToQuery(condition));
                return [{ total: 1 }];
              },
            };
          },
        };
      }
      return {
        from(table) {
          assert.equal(table, notificationEntries);
          return {
            where(condition) {
              conditions.push(dialect.sqlToQuery(condition));
              return {
                orderBy() {
                  return {
                    limit() {
                      return {
                        offset: async () => [],
                      };
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

  await listCustomerNotificationEntries(
    "customer-123",
    { page: 1, limit: 20 },
    database,
  );

  assert.equal(conditions.length, 3);
  for (const condition of conditions) {
    assert.match(condition.sql, /"user_id"/);
    assert.ok(condition.params.includes("customer-123"));
  }
});

test("customer notification endpoints reject staff accounts", async () => {
  const controller = new NotificationsController({});
  assert.throws(
    () =>
      controller.getCustomerNotifications(
        { user: { _id: "admin-id", role: "admin" } },
        {},
      ),
    ForbiddenException,
  );
});

test("customer API uses only the authenticated user's ID", async () => {
  const received = [];
  const controller = new NotificationsController({
    getCustomerNotifications: async (userId, query) => {
      received.push({ userId, query });
      return { success: true };
    },
  });
  const request = {
    user: { _id: "customer-123", role: "customer" },
  };

  await controller.getCustomerNotifications(request, { page: "2" });
  assert.deepEqual(received, [
    { userId: "customer-123", query: { page: "2" } },
  ]);
});
