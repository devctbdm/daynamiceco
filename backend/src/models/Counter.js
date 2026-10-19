import { check, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const sequenceCounters = pgTable(
  "sequence_counters",
  {
    key: text("key").primaryKey(),
    seq: integer("seq").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("sequence_counters_seq_nonnegative", sql`${table.seq} >= 0`),
  ],
);
