// backend/src/utils/categoryTree.js
import { eq } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import { categoryEntries } from "../models/Category.js";

// Builds a lightweight in-memory index of the category tree so promo
// category matching can be hierarchical (a promo on a parent category
// also applies to every descendant category).
let cache = null;

async function loadTree() {
  if (cache) return cache;
  const cats = await getDatabase()
    .select({
      id: categoryEntries.id,
      name: categoryEntries.name,
      parentId: categoryEntries.parentId,
    })
    .from(categoryEntries);
  const byName = new Map();
  const byId = new Map();
  const childrenOf = new Map();
  cats.forEach((c) => {
    const category = { ...c, _id: c.id };
    byId.set(c.id, category);
    byName.set(String(c.name).trim().toLowerCase(), category);
  });
  cats.forEach((c) => {
    const pid = c.parentId ? String(c.parentId) : null;
    if (pid && byId.has(pid)) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid).push(c);
    }
  });
  cache = { byId, byName, childrenOf };
  return cache;
}

// Given a list of category names (or ids), return the expanded set of names
// that includes each one plus all of its descendants.
export async function expandPromoCategories(names = []) {
  const { byName, byId, childrenOf } = await loadTree();
  const result = new Set();
  const stack = [...names];

  while (stack.length) {
    const n = stack.pop();
    if (n == null) continue;
    const key = typeof n === "string" ? n.trim().toLowerCase() : String(n);
    const cat =
      byName.get(key) || (byId.has(String(n)) ? byId.get(String(n)) : null);

    if (!cat) {
      result.add(key);
      continue;
    }
    result.add(String(cat.name).trim().toLowerCase());
    const kids = childrenOf.get(String(cat._id)) || [];
    kids.forEach((k) => stack.push(k.name));
  }
  return [...result];
}

export function clearCategoryCache() {
  cache = null;
}
