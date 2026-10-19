import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  normalizeMongoNotification,
  validateNotifications,
} from "../scripts/import-notifications-to-neon.js";
import {
  notificationEntries,
  serializeNotification,
} from "../src/models/Notification.js";
import {
  createNotificationEntry,
  countUnreadNotifications,
  listNotificationEntries,
  markAllNotificationsRead,
  markNotificationRead,
} from "../src/notifications/notifications.repository.js";
import { NotificationsService } from "../src/notifications/notifications.service.js";

test("notification schema preserves all fields and indexes history/read state", () => {
  const table = getTableConfig(notificationEntries);
  assert.equal(table.name, "notification_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "category",
      "title",
      "description",
      "link",
      "read",
      "order_id",
      "created_at",
      "updated_at",
    ],
  );
  assert.deepEqual(
    table.indexes.map((index) => index.config.name),
    ["notification_entries_created_at_idx", "notification_entries_read_idx"],
  );
  assert.equal(table.checks.length, 3);
});

test("notification serialization retains Mongo-compatible field names", () => {
  const notification = serializeNotification({
    id: "notification-id",
    category: "order",
    orderId: "order-id",
    title: "New order",
  });
  assert.equal(notification._id, "notification-id");
  assert.equal(notification.order, "order-id");
  assert.equal(notification.title, "New order");
  assert.equal("id" in notification, false);
  assert.equal("orderId" in notification, false);
});

test("notification repository persists a new notification and its defaults", async () => {
  let values;
  const database = {
    insert(table) {
      assert.equal(table, notificationEntries);
      return {
        values(input) {
          values = input;
          return { returning: async () => [input] };
        },
      };
    },
  };
  const notification = await createNotificationEntry(
    {
      category: "order",
      title: "New order",
      description: "Order placed",
      order: "order-id",
    },
    database,
  );
  assert.match(values.id, /^[\da-f-]{36}$/i);
  assert.equal(values.link, "");
  assert.equal(values.read, false);
  assert.equal(values.orderId, "order-id");
  assert.equal(notification._id, values.id);
  assert.equal(notification.order, "order-id");
});

test("notification query preserves pagination and returns the global unread count", async () => {
  const whereConditions = [];
  const pageCalls = [];
  const database = {
    select(selection) {
      if (selection) {
        let table;
        return {
          from(value) {
            table = value;
            assert.equal(table, notificationEntries);
            return {
              where: async (condition) => {
                whereConditions.push(condition);
                return [{ total: whereConditions.length === 1 ? 2 : 7 }];
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
              whereConditions.push(condition);
              return {
                orderBy(order) {
                  pageCalls.push(["orderBy", order]);
                  return {
                    limit(limit) {
                      pageCalls.push(["limit", limit]);
                      return {
                        offset: async (offset) => {
                          pageCalls.push(["offset", offset]);
                          return [
                            {
                              id: "notification-id",
                              category: "order",
                              title: "New order",
                              description: "Order placed",
                              link: "",
                              read: false,
                              orderId: null,
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
    },
  };
  const result = await listNotificationEntries(
    { page: 2, limit: 10, read: false, category: "order" },
    database,
  );
  assert.equal(result.total, 2);
  assert.equal(result.unreadCount, 7);
  assert.equal(result.notifications[0]._id, "notification-id");
  assert.deepEqual(
    pageCalls.filter(([name]) => ["limit", "offset"].includes(name)),
    [
      ["limit", 10],
      ["offset", 10],
    ],
  );
  assert.equal(whereConditions.length, 3);
});

test("notification repository counts unread and marks one or all notifications read", async () => {
  const conditions = [];
  const updates = [];
  const database = {
    select() {
      return {
        from(table) {
          assert.equal(table, notificationEntries);
          return {
            where: async (condition) => {
              conditions.push(condition);
              return [{ total: 4 }];
            },
          };
        },
      };
    },
    update(table) {
      assert.equal(table, notificationEntries);
      return {
        set(values) {
          updates.push(values);
          return {
            where(condition) {
              conditions.push(condition);
              return {
                returning: async () => [
                  {
                    id: "notification-id",
                    category: "system",
                    title: "System update",
                    description: "Updated",
                    link: "",
                    read: true,
                    orderId: null,
                    ...values,
                  },
                ],
              };
            },
          };
        },
      };
    },
  };
  assert.equal(await countUnreadNotifications(database), 4);
  const updated = await markNotificationRead("notification-id", database);
  assert.equal(updated.read, true);
  await markAllNotificationsRead(database);
  assert.equal(updates.length, 2);
  assert.ok(conditions.length >= 3);
});

test("notification service preserves admin API envelopes and pagination defaults", async () => {
  const database = {
    select(selection) {
      if (selection) {
        return {
          from() {
            return {
              where: async () => [{ total: 3 }],
            };
          },
        };
      }
      return {
        from() {
          return {
            where() {
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
  const service = new NotificationsService(database);
  const response = await service.getNotifications({});
  assert.deepEqual(response, {
    success: true,
    notifications: [],
    total: 3,
    unreadCount: 3,
    page: 1,
    pages: 1,
  });
  assert.deepEqual(await service.getUnreadCount(), {
    success: true,
    unreadCount: 3,
  });
});

test("notification importer normalizes Mongo references and rejects invalid data", () => {
  const notification = normalizeMongoNotification({
    _id: "507f1f77bcf86cd799439011",
    category: "payment",
    title: "Payment received",
    description: "Order paid",
    link: "/admin/orders?id=123",
    read: true,
    order: "507f191e810c19729de860ea",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });
  validateNotifications([notification]);
  assert.equal(notification.orderId, "507f191e810c19729de860ea");
  assert.equal(notification.category, "payment");
  assert.equal(notification.read, true);
  assert.throws(
    () => validateNotifications([{ ...notification, category: "invalid" }]),
    /are invalid/,
  );
  assert.throws(
    () => validateNotifications([{ ...notification, title: "" }]),
    /are invalid/,
  );
});
