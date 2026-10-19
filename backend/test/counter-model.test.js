import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { sequenceCounters } from "../src/models/Counter.js";

test("counter schema defines a keyed PostgreSQL sequence table", () => {
  const config = getTableConfig(sequenceCounters);

  assert.equal(config.name, "sequence_counters");
  assert.deepEqual(
    config.columns.map((column) => column.name),
    ["key", "seq", "updated_at"],
  );
  assert.equal(config.columns[0].primary, true);
  assert.ok(
    config.checks.some(
      (constraint) => constraint.name === "sequence_counters_seq_nonnegative",
    ),
  );
});
