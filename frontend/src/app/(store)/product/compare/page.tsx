// src/app/(store)/product/compare/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { productApi } from '@/lib/api';
import type { RawProduct } from '@/lib/productMapper';
import { useCompare } from '@/store';
import { Star, Search, X, Plus, Scale, CheckCircle2, ExternalLink } from 'lucide-react';

const MAX_COMPARE = 4;

function finalPrice(p: RawProduct) {
  return p.discountPrice > 0 && p.discountPrice < p.price
    ? p.discountPrice
    : p.price;
}

function statusInfo(p: RawProduct) {
  if (p.status === 'out_of_stock' || p.stock <= 0) {
    return { label: 'Out of Stock', classes: 'bg-red-50 text-red-600 border-red-200' };
  }
  if (p.status === 'draft') {
    return { label: 'Draft', classes: 'bg-amber-50 text-amber-600 border-amber-200' };
  }
  return { label: 'In Stock', classes: 'bg-green-50 text-green-600 border-green-200' };
}

function flattenSpecs(specs: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!specs || typeof specs !== 'object') return out;

  const structured = specs._keySpecs || specs._keyFeatures || specs._specGroups;
  if (structured) {
    if (specs._keySpecs && typeof specs._keySpecs === 'object') {
      for (const [k, v] of Object.entries(specs._keySpecs)) {
        out[String(k)] = String(v ?? '');
      }
    }
    if (specs._keyFeatures && typeof specs._keyFeatures === 'object') {
      for (const [k, v] of Object.entries(specs._keyFeatures)) {
        out[`Feature: ${String(k)}`] = String(v ?? '');
      }
    }
    if (specs._specGroups && typeof specs._specGroups === 'object') {
      for (const [group, fields] of Object.entries(specs._specGroups)) {
        if (fields && typeof fields === 'object') {
          for (const [k, v] of Object.entries(fields)) {
            out[`${group} - ${String(k)}`] = String(v ?? '');
          }
        }
      }
    }
  } else {
    for (const [k, v] of Object.entries(specs)) {
      if (v !== null && typeof v === 'object') continue;
      out[String(k)] = String(v ?? '');
    }
  }
  return out;
}

function productImage(p: RawProduct) {
  return p.images && p.images.length > 0 ? p.images[0] : '/placeholder-image.png';
}

function approvedReviewCount(p: RawProduct) {
  return (p.ratings || []).filter((r) => r.status === 'approved').length;
}

export default function ComparePage() {
  const {
    compareItems,
    addToCompare,
    removeFromCompare,
    clearCompare,
  } = useCompare();
  const [products, setProducts] = useState<RawProduct[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addProduct = (p: RawProduct) => {
    addToCompare({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      image: productImage(p),
      price: p.price,
      discountPrice: p.discountPrice,
      stock: p.stock,
      status: p.status,
      averageRating: p.averageRating || 0,
    });
    setQuery('');
    setResults([]);
    setSearchOpen(false);
  };

  // Load full product details for every item in the comparison list
  useEffect(() => {
    const ids = compareItems.map((i) => i._id);
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fetched = await Promise.all(
          ids.map((id) => productApi.getById(id).then((r) => r.data.product))
        );
        if (!cancelled) {
          setProducts(
            fetched.filter((p) => p && p.status !== 'draft')
          );
        }
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compareItems]);

  // Debounced backend search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await productApi.getAll({ search: q, limit: 8 });
        setResults(
          (data.products || []).filter((p: RawProduct) => p.status !== 'draft')
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const bestPrice = useMemo(() => {
    if (products.length < 2) return null;
    return Math.min(...products.map(finalPrice));
  }, [products]);

  const bestRating = useMemo(() => {
    if (products.length < 2) return null;
    const max = Math.max(...products.map((p) => p.averageRating || 0));
    return max > 0 ? max : null;
  }, [products]);

  const specRows = useMemo(() => {
    if (products.length < 2) return [] as { label: string; values: string[] }[];
    const flattened = products.map((p) =>
      flattenSpecs(p.specifications || {})
    );
    const labels: string[] = [];
    flattened.forEach((f) => {
      for (const k of Object.keys(f)) {
        if (!labels.includes(k)) labels.push(k);
      }
    });
    return labels.map((label) => ({
      label,
      values: flattened.map((f) => f[label] || '—'),
    }));
  }, [products]);

  const canAdd = compareItems.length < MAX_COMPARE;

  return (
    <div className="max-w-7xl m-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Scale size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Compare Products
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Add up to {MAX_COMPARE} products side by side and make the best
                choice.
              </p>
            </div>
          </div>
        </div>
        {compareItems.length > 0 && (
          <button
            type="button"
            onClick={clearCompare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition"
          >
            <X size={15} /> Clear all ({compareItems.length}/{MAX_COMPARE})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mt-6" ref={searchBoxRef}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder={
              canAdd
                ? 'Search products to compare (type at least 2 products)...'
                : `Comparison is full (${MAX_COMPARE} products). Remove one to add more.`
            }
            disabled={!canAdd}
            className="w-full rounded-2xl border border-gray-300 bg-white py-3.5 pl-12 pr-11 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchOpen && query.trim() && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            {searching ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                Searching products...
              </div>
            ) : results.length > 0 ? (
              <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {results.map((p) => {
                  const added = compareItems.some((s) => s._id === p._id);
                  const full = !added && !canAdd;
                  return (
                    <li key={p._id}>
                      <button
                        type="button"
                        disabled={added || full}
                        onClick={() => addProduct(p)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                          added || full
                            ? 'cursor-not-allowed bg-gray-50 opacity-60'
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          <Image
                            src={productImage(p)}
                            alt={p.name}
                            fill
                            className="object-contain"
                            sizes="48px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {p.name}
                          </p>
                          <p className="text-sm font-semibold text-green-700">
                            ৳{finalPrice(p).toLocaleString()}
                          </p>
                        </div>
                        {added ? (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Added
                          </span>
                        ) : full ? (
                          <span className="shrink-0 text-xs text-gray-400">
                            Max {MAX_COMPARE}
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-500 text-blue-600">
                            <Plus size={16} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No products found for “{query.trim()}”.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slots */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: MAX_COMPARE }).map((_, i) => {
          const p = products[i];
          if (!p) {
            return (
              <div
                key={`empty-${i}`}
                className="flex min-h-52.5 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-4 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Plus size={20} />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-500">
                  Slot {i + 1} — empty
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Use the search above to add a product
                </p>
              </div>
            );
          }
          const status = statusInfo(p);
          return (
            <div
              key={p._id}
              className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => removeFromCompare(p._id)}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-red-100 hover:text-red-600"
                aria-label={`Remove ${p.name}`}
              >
                <X size={15} />
              </button>
              <Link
                href={`/product/${p.slug}`}
                className="relative h-36 w-full overflow-hidden rounded-xl bg-gray-50"
              >
                <Image
                  src={productImage(p)}
                  alt={p.name}
                  fill
                  className="object-contain transition group-hover:scale-105"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </Link>
              <p className="mt-3 line-clamp-2 text-sm font-medium text-gray-800 min-h-10">
                {p.name}
              </p>
              <p className="mt-1 text-lg font-bold text-green-700">
                ৳{finalPrice(p).toLocaleString()}
                {p.discountPrice > 0 && p.discountPrice < p.price && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400 line-through">
                    ৳{p.price.toLocaleString()}
                  </span>
                )}
              </p>
              <span
                className={`mt-2 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.classes}`}
              >
                {status.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      {products.length >= 2 ? (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">
            Specification Comparison
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} of {MAX_COMPARE} products compared. Add more to
            see a wider view.
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-190 border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-500">
                    Attributes
                  </th>
                  {products.map((p) => {
                    const isBestPrice =
                      bestPrice !== null && finalPrice(p) === bestPrice;
                    return (
                      <th
                        key={p._id}
                        className="min-w-55 border-l border-gray-200 px-4 py-3 align-top"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/product/${p.slug}`}
                            className="group flex items-center gap-1 font-medium text-gray-900 hover:text-blue-600"
                          >
                            <span className="line-clamp-2">{p.name}</span>
                            <ExternalLink
                              size={13}
                              className="shrink-0 text-gray-400 group-hover:text-blue-500"
                            />
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCompare(p._id)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600"
                            aria-label={`Remove ${p.name}`}
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <Link href={`/product/${p.slug}`}>
                          <div className="relative mx-auto mt-2 h-24 w-full overflow-hidden rounded-lg bg-gray-50">
                            <Image
                              src={productImage(p)}
                              alt={p.name}
                              fill
                              className="object-contain"
                              sizes="220px"
                            />
                          </div>
                        </Link>
                        {isBestPrice && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            <CheckCircle2 size={13} /> Best Price
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Price */}
                <tr className="border-t border-gray-200">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    Price
                  </td>
                  {products.map((p) => (
                    <td key={p._id} className="border-l border-gray-200 px-4 py-3">
                      <p className="text-base font-bold text-green-700">
                        ৳{finalPrice(p).toLocaleString()}
                      </p>
                      {p.discountPrice > 0 && p.discountPrice < p.price && (
                        <p className="text-xs text-gray-400 line-through">
                          ৳{p.price.toLocaleString()}
                        </p>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Status */}
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    Availability
                  </td>
                  {products.map((p) => {
                    const s = statusInfo(p);
                    return (
                      <td key={p._id} className="border-l border-gray-200 px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.classes}`}
                        >
                          {s.label}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Rating */}
                <tr className="border-t border-gray-200">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    Rating
                  </td>
                  {products.map((p) => {
                    const isBest =
                      bestRating !== null && (p.averageRating || 0) === bestRating;
                    return (
                      <td key={p._id} className="border-l border-gray-200 px-4 py-3">
                        {p.averageRating > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={15}
                                  fill={
                                    i < Math.round(p.averageRating)
                                      ? 'currentColor'
                                      : 'none'
                                  }
                                  className={
                                    i < Math.round(p.averageRating)
                                      ? 'text-yellow-400'
                                      : 'text-gray-300'
                                  }
                                />
                              ))}
                            </span>
                            <span className="font-semibold text-gray-800">
                              {p.averageRating.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({approvedReviewCount(p)})
                            </span>
                            {isBest && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Top
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No ratings</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Stock */}
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    Stock
                  </td>
                  {products.map((p) => (
                    <td key={p._id} className="border-l border-gray-200 px-4 py-3">
                      <span className="text-gray-800">{p.stock}</span>
                    </td>
                  ))}
                </tr>

                {/* Category */}
                <tr className="border-t border-gray-200">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    Category
                  </td>
                  {products.map((p) => (
                    <td key={p._id} className="border-l border-gray-200 px-4 py-3 capitalize text-gray-800">
                      {(p.categories && p.categories.length > 0
                        ? p.categories.join(', ')
                        : p.category) || '—'}
                    </td>
                  ))}
                </tr>

                {/* Product Code */}
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    Product Code
                  </td>
                  {products.map((p) => (
                    <td key={p._id} className="border-l border-gray-200 px-4 py-3 text-gray-800">
                      {p.productCode || '—'}
                    </td>
                  ))}
                </tr>

                {/* SKU */}
                <tr className="border-t border-gray-200">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    SKU
                  </td>
                  {products.map((p) => {
                    const sku = (p as RawProduct & { sku?: string }).sku;
                    return (
                      <td key={p._id} className="border-l border-gray-200 px-4 py-3 text-gray-800">
                        {sku || '—'}
                      </td>
                    );
                  })}
                </tr>

                {/* Brand */}
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600">
                    Brand
                  </td>
                  {products.map((p) => {
                    const flat = flattenSpecs(p.specifications || {});
                    const brand = flat['Brand'] || flat['brand'] || '—';
                    return (
                      <td key={p._id} className="border-l border-gray-200 px-4 py-3 text-gray-800">
                        {brand}
                      </td>
                    );
                  })}
                </tr>

                {/* Specifications */}
                {specRows.length > 0 && (
                  <>
                    <tr>
                      <td
                        colSpan={products.length + 1}
                        className="border-t border-gray-200 bg-blue-50/60 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-blue-700"
                      >
                        Specifications
                      </td>
                    </tr>
                    {specRows.map((row, ri) => (
                      <tr
                        key={row.label}
                        className={`border-t border-gray-200 ${ri % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                      >
                        <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium capitalize text-gray-600">
                          {row.label.replace(/[-_]/g, ' ')}
                        </td>
                        {row.values.map((v, vi) => (
                          <td
                            key={vi}
                            className="border-l border-gray-200 px-4 py-3 text-gray-800 whitespace-pre-line"
                          >
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-14 text-center">
          <Scale size={40} className="text-gray-300" />
          <p className="mt-3 font-medium text-gray-700">
            Add at least 2 products to start comparing
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Use the search box above to find and add products to your
            comparison.
          </p>
        </div>
      )}
    </div>
  );
}
