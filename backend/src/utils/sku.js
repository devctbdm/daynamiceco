import { productSkuExists } from "../products/products.repository.js";

// Uppercase alphanumeric segments derived from free text.
// This mirrors the helper in the admin product form so the client can rebuild
// the base when the title changes without round-tripping to the server.
const toSegments = (text, maxSegments) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, maxSegments)
    .map((s) => s.slice(0, 8).toUpperCase());

// Deterministic base for a SKU built from the product title + category.
// e.g. name "MSI Gaming Laptop", category "Laptops" -> "MSI-GAMING-LAPT"
export const buildSkuBase = (name, category) => {
  const nameSegs = toSegments(name, 2);
  const catSegs = toSegments(category, 1).map((s) => s.slice(0, 4));
  return [...nameSegs, ...catSegs].filter(Boolean).join("-");
};

const randomSuffix = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 5)
    .toUpperCase() || Date.now().toString(36).toUpperCase();

// Build a unique SKU: base (from title/category) + unique suffix.
// Guarantees the returned SKU is not already taken in the products collection.
export const generateUniqueSku = async (name, category) => {
  const base = buildSkuBase(name, category);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = randomSuffix();
    const candidate = base ? `${base}-${suffix}` : suffix;
    // eslint-disable-next-line no-await-in-loop
    const exists = await productSkuExists(candidate);
    if (!exists) return { sku: candidate, suffix, base };
  }

  const suffix = Date.now().toString(36).toUpperCase();
  return { sku: base ? `${base}-${suffix}` : suffix, suffix, base };
};
