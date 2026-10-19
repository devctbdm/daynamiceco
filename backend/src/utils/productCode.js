import { incrementCounter } from "../counters/counter.repository.js";
import { getDatabase } from "../db/database.js";
import { productCodeExists } from "../products/products.repository.js";

const CODE_PREFIX = "PC-";
const CODE_WIDTH = 6;

// Atomically allocate the next sequential product code (PC-000001, PC-000002, ...).
// The Counter collection is the source of truth, so codes never collide with each
// other even under concurrent requests. We additionally verify against the
// products collection to skip any code that was already used manually.
export const getNextProductCode = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const sequence = await incrementCounter(getDatabase(), "productCode");
    const candidate = `${CODE_PREFIX}${String(sequence).padStart(CODE_WIDTH, "0")}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await productCodeExists(candidate))) return candidate;
  }
  // Extremely unlikely fallback: base36 timestamp keeps the code unique even if
  // the counter is somehow far behind existing manual codes.
  return `${CODE_PREFIX}${Date.now().toString(36).toUpperCase()}`;
};
