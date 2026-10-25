import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    orderId: text("order_id"),
    grantId: text("grant_id"),
    type: text("type").notNull(),
    points: integer("points").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    reason: text("reason").notNull().default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("loyalty_transactions_idempotency_unique").on(
      table.idempotencyKey,
    ),
    index("loyalty_transactions_customer_created_idx").on(
      table.customerId,
      table.createdAt,
    ),
    index("loyalty_transactions_customer_grant_idx").on(
      table.customerId,
      table.grantId,
    ),
    index("loyalty_transactions_order_idx").on(table.orderId),
    index("loyalty_transactions_expiration_idx").on(table.expiresAt),
    check(
      "loyalty_transactions_type_check",
      sql`${table.type} in ('earn', 'redeem', 'restore', 'refund', 'adjustment', 'expire')`,
    ),
  ],
);
