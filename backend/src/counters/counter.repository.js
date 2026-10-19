import { sql } from "drizzle-orm";
import { sequenceCounters } from "../models/Counter.js";

export async function incrementCounter(database, key) {
  if (typeof key !== "string" || !key.trim()) {
    throw new TypeError("Counter key is required");
  }

  const [counter] = await database
    .insert(sequenceCounters)
    .values({ key: key.trim(), seq: 1 })
    .onConflictDoUpdate({
      target: sequenceCounters.key,
      set: {
        seq: sql`${sequenceCounters.seq} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ seq: sequenceCounters.seq });

  if (!counter) {
    throw new Error(`Failed to increment counter "${key}"`);
  }

  return counter.seq;
}
