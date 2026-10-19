import { asc, eq, isNull, or, sql } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import { customerOrders } from "../db/schema.js";
import { incrementCounter } from "../counters/counter.repository.js";

const ORDER_PREFIX = "#";

export const migrateLegacyOrderData = async (database = getDatabase()) => {
  const statusResult = await database.execute(sql`
    UPDATE customer_orders
    SET order_status = 'processing', updated_at = now()
    WHERE order_status IN ('shipped', 'delivered')
    RETURNING id
  `);

  const numberResult = await database.execute(sql`
    WITH normalized AS (
      SELECT orders.id,
        '#' || substring(orders.order_number from 5) AS order_number
      FROM customer_orders AS orders
      WHERE orders.order_number ~* '^AIZ-[0-9]+$'
        AND NOT EXISTS (
          SELECT 1
          FROM customer_orders AS existing
          WHERE existing.order_number =
            '#' || substring(orders.order_number from 5)
            AND existing.id <> orders.id
        )
    )
    UPDATE customer_orders AS orders
    SET order_number = normalized.order_number, updated_at = now()
    FROM normalized
    WHERE orders.id = normalized.id
    RETURNING orders.id
  `);

  return {
    statuses: statusResult.rows?.length ?? 0,
    orderNumbers: numberResult.rows?.length ?? 0,
  };
};

// Atomically fetch the next sequential order number (#1, #2, ...).
export const getNextOrderNumber = async () => {
  const sequence = await incrementCounter(getDatabase(), "order");
  return `${ORDER_PREFIX}${sequence}`;
};

// One-time backfill: assign sequential numbers to any existing orders that
// don't have one yet (in creation order). Safe to call on every boot.
export const backfillOrderNumbers = async () => {
  const database = getDatabase();
  const missing = await database
    .select({ id: customerOrders.id })
    .from(customerOrders)
    .where(
      or(
        isNull(customerOrders.orderNumber),
        eq(customerOrders.orderNumber, ""),
      ),
    )
    .orderBy(asc(customerOrders.createdAt));

  for (const { id } of missing) {
    const orderNumber = await getNextOrderNumber();
    await database
      .update(customerOrders)
      .set({
        orderNumber,
        updatedAt: new Date(),
      })
      .where(eq(customerOrders.id, id));
  }
  return missing.length;
};
