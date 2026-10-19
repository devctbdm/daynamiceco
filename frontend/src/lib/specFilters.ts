// src/lib/specFilters.ts
import type { Product } from '@/types/product';

export type SortOption =
  'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';

export interface FilterState {
  price: [number, number] | null;
  availability: ('in' | 'out')[];
  rating: number | null; // minimum quality/rating threshold (2–5)
  specs: Record<string, string[]>;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetGroup {
  key: string;
  label: string;
  values: FacetValue[];
}

export const EMPTY_FILTERS: FilterState = {
  price: null,
  availability: [],
  rating: null,
  specs: {},
};

const FIELD_DEFS: Record<string, { label: string; aliases: string[] }> = {
  Brand: { label: 'Brand', aliases: ['brand', 'manufacturer', 'make'] },
  Type: { label: 'Type', aliases: ['type', 'device type'] },
  Processor: {
    label: 'Processor',
    aliases: ['processor', 'cpu', 'processor model', 'processor brand'],
  },
  RAM: {
    label: 'RAM',
    aliases: ['ram', 'memory', 'memory capacity', 'memory size'],
  },
  'Graphics Card': {
    label: 'Graphics Card',
    aliases: ['graphics card', 'gpu', 'graphics', 'video card'],
  },
  Storage: {
    label: 'Storage',
    aliases: ['storage', 'ssd', 'hdd', 'storage capacity', 'storage type'],
  },
  Motherboard: {
    label: 'Motherboard',
    aliases: ['motherboard', 'chipset', 'motherboard model'],
  },
  'Screen Size': {
    label: 'Screen Size',
    aliases: ['screen size', 'display size', 'size', 'monitor size'],
  },
  Resolution: {
    label: 'Resolution',
    aliases: ['resolution', 'max resolution', 'native resolution'],
  },
  'Panel Type': {
    label: 'Panel Type',
    aliases: ['panel type', 'panel'],
  },
  'Refresh Rate': {
    label: 'Refresh Rate',
    aliases: ['refresh rate', 'refresh', 'refresh rate hz'],
  },
  'Input Type': {
    label: 'Input Type',
    aliases: [
      'input type',
      'ports',
      'connectivity',
      'interfaces',
      'inputs',
      'input ports',
    ],
  },
  'Wi-Fi Standard': {
    label: 'Wi-Fi Standard',
    aliases: [
      'wi-fi standard',
      'wifi standard',
      'wireless standard',
      'wireless',
    ],
  },
  'WiFi Speed': {
    label: 'WiFi Speed',
    aliases: [
      'wifi speed',
      'wi-fi speed',
      'wireless speed',
      'speed',
      'transfer rate',
    ],
  },
  Bands: {
    label: 'Number of Bands',
    aliases: ['number of bands', 'bands', 'band', 'band support'],
  },
  'LAN Ports': {
    label: 'LAN Ports',
    aliases: [
      'lan ports',
      'number of lan ports',
      'ethernet ports',
      'ports count',
      'lan',
    ],
  },
  Features: {
    label: 'Features',
    aliases: [
      'features',
      'special features',
      'additional features',
      'key features',
    ],
  },
};

const EXCLUDED_KEYS = new Set([
  'model',
  'model number',
  'sku',
  'upc',
  'item',
  'part number',
  'product code',
  'weight',
  'dimensions',
  'box content',
  'includes',
  'warranty',
]);

const FIELD_ORDER = [
  'Brand',
  'Type',
  'Processor',
  'RAM',
  'Graphics Card',
  'Storage',
  'Motherboard',
  'Screen Size',
  'Resolution',
  'Panel Type',
  'Refresh Rate',
  'Input Type',
  'Wi-Fi Standard',
  'WiFi Speed',
  'Bands',
  'LAN Ports',
  'Features',
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, ' ').trim();
}

function canonicalize(key: string): { key: string; label: string } {
  const norm = normalizeKey(key);
  for (const def of Object.values(FIELD_DEFS)) {
    if (def.aliases.includes(norm)) return { key: def.label, label: def.label };
  }
  if (EXCLUDED_KEYS.has(norm)) return { key: '', label: '' };
  const label = key
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { key: label, label };
}

export function extractProductSpecs(
  specs: Record<string, any>
): Map<string, string> {
  const result = new Map<string, string>();
  const sources: Record<string, any>[] = [];
  if (specs?._keySpecs && typeof specs._keySpecs === 'object') {
    sources.push(specs._keySpecs);
  }
  if (specs?._specGroups && typeof specs._specGroups === 'object') {
    for (const group of Object.values(specs._specGroups)) {
      if (group && typeof group === 'object') sources.push(group);
    }
  }
  if (specs?._keyFeatures && typeof specs._keyFeatures === 'object') {
    sources.push(specs._keyFeatures);
  }

  for (const source of sources) {
    for (const [rawKey, rawValue] of Object.entries(source)) {
      if (rawValue == null || typeof rawValue === 'object') continue;
      const { key, label } = canonicalize(rawKey);
      if (!key || !label) continue;
      const value = String(rawValue).trim();
      if (!value) continue;
      if (!result.has(key)) result.set(key, value);
    }
  }
  return result;
}

export function buildFacetGroups(products: Product[]): FacetGroup[] {
  const map = new Map<string, Map<string, number>>();
  for (const p of products) {
    const specs = extractProductSpecs(
      (p.specifications ?? {}) as Record<string, any>
    );
    for (const [key, value] of specs) {
      let values = map.get(key);
      if (!values) {
        values = new Map();
        map.set(key, values);
      }
      values.set(value, (values.get(value) ?? 0) + 1);
    }
  }

  const groups: FacetGroup[] = [];
  for (const [key, values] of map) {
    groups.push({
      key,
      label: FIELD_DEFS[key]?.label ?? key,
      values: [...values.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    });
  }

  const orderRank = (k: string) => {
    const i = FIELD_ORDER.indexOf(k);
    return i === -1 ? FIELD_ORDER.length : i;
  };
  groups.sort(
    (a, b) =>
      orderRank(a.key) - orderRank(b.key) || a.label.localeCompare(b.label)
  );
  return groups;
}

export function effectivePrice(p: Product): number {
  return p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;
}

export function getPriceRange(products: Product[]): [number, number] {
  const prices = products
    .map(effectivePrice)
    .filter((v) => Number.isFinite(v) && v >= 0);
  if (prices.length === 0) return [0, 0];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return [min, max <= min ? min + 1 : max];
}

export function applyFilters(
  products: Product[],
  filters: FilterState
): Product[] {
  return products.filter((p) => {
    if (filters.price) {
      const price = effectivePrice(p);
      const [min, max] = filters.price;
      if (price < min || price > max) return false;
    }

    if (filters.availability.length === 1) {
      const wantIn = filters.availability[0] === 'in';
      const inStock = p.stock > 0;
      if (wantIn !== inStock) return false;
    }

    if (filters.rating != null) {
      if ((p.averageRating || 0) < filters.rating) return false;
    }

    const specs = extractProductSpecs(
      (p.specifications ?? {}) as Record<string, any>
    );
    for (const [key, selected] of Object.entries(filters.specs)) {
      if (selected.length === 0) continue;
      const value = specs.get(key);
      if (!value) return false;
      if (!selected.some((s) => s.toLowerCase() === value.toLowerCase()))
        return false;
    }

    return true;
  });
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const arr = [...products];
  switch (sort) {
    case 'price-asc':
      arr.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case 'price-desc':
      arr.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    case 'newest':
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case 'rating':
      arr.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      break;
    default:
      arr.sort(
        (a, b) =>
          (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
          (b.averageRating || 0) - (a.averageRating || 0)
      );
      break;
  }
  return arr;
}

export function hasActiveFilters(
  filters: FilterState,
  range: [number, number]
): boolean {
  const priceActive =
    !!filters.price &&
    (filters.price[0] !== range[0] || filters.price[1] !== range[1]);
  return (
    priceActive ||
    filters.availability.length > 0 ||
    filters.rating != null ||
    Object.keys(filters.specs).length > 0
  );
}
