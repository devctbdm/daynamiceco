import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  notificationCampaignEntries,
  notificationEntries,
} from "../src/models/Notification.js";
import { userEntries } from "../src/models/User.js";
import { createNotificationCampaign } from "../src/notifications/notifications.repository.js";
import { NotificationsService } from "../src/notifications/notifications.service.js";

test("campaign delivery creates one customer-scoped inbox item per active customer", async () => {
  const customers = [{ id: "customer-one" }, { id: "customer-two" }];
  let campaignRow;
  let deliveredEntries;
  const database = {
    transaction: async (work) =>
      work({
        select: () => ({
          from: (table) => {
            assert.equal(table, userEntries);
            return { where: async () => customers };
          },
        }),
        insert: (table) => ({
          values: (values) => {
            if (table === notificationCampaignEntries) {
              campaignRow = values;
              return { returning: async () => [values] };
            }
            assert.equal(table, notificationEntries);
            deliveredEntries = values;
            return Promise.resolve();
          },
        }),
      }),
  };

  const result = await createNotificationCampaign(
    {
      title: "Holiday hours",
      description: "We will be closed on Friday.",
      category: "system",
      link: "/contact",
    },
    database,
  );

  assert.equal(campaignRow.recipientCount, 2);
  assert.equal(deliveredEntries.length, 2);
  assert.deepEqual(
    deliveredEntries.map(({ userId }) => userId),
    ["customer-one", "customer-two"],
  );
  assert.ok(
    deliveredEntries.every(({ campaignId }) => campaignId === campaignRow.id),
  );
  assert.ok(deliveredEntries.every(({ read }) => read === false));
  assert.deepEqual(result.recipientIds, ["customer-one", "customer-two"]);
});

test("campaign validation rejects unsafe links and malformed bodies", async () => {
  const service = new NotificationsService({});
  const validFields = {
    title: "Store update",
    description: "A customer announcement.",
    category: "system",
  };

  await assert.rejects(
    service.createCampaign({
      ...validFields,
      link: "javascript:alert(1)",
    }),
    BadRequestException,
  );
  await assert.rejects(service.createCampaign(null), BadRequestException);
});
