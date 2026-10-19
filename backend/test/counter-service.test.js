import assert from "node:assert/strict";
import test from "node:test";
import { CounterService } from "../src/counters/counter.service.js";

test("counter increments use an atomic PostgreSQL upsert", async () => {
  let insertValues;
  let conflictConfig;
  let returningSelection;
  const database = {
    insert(table) {
      return {
        values(values) {
          insertValues = values;
          return this;
        },
        onConflictDoUpdate(config) {
          conflictConfig = config;
          return this;
        },
        returning(selection) {
          returningSelection = selection;
          return Promise.resolve([{ seq: 42 }]);
        },
      };
    },
  };
  const service = new CounterService(database);

  assert.equal(await service.next(" order "), 42);
  assert.equal(insertValues.key, "order");
  assert.equal(insertValues.seq, 1);
  assert.ok(conflictConfig.set.seq);
  assert.ok(conflictConfig.set.updatedAt instanceof Date);
  assert.ok(returningSelection.seq);
});

test("counter rejects empty keys without querying the database", async () => {
  const service = new CounterService({
    insert() {
      throw new Error("Database should not be called");
    },
  });

  await assert.rejects(service.next(" "), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.equal(error.message, "Counter key is required");
    return true;
  });
});
