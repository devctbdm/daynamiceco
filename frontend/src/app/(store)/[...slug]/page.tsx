'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { productApi, productFilterApi } from '@/lib/api';
import type { Category, ProductFilterSettings } from '@/lib/api';
import { categoriesResource } from '@/lib/resources';
import { toProductShape, type RawProduct } from '@/lib/productMapper';
import { ProductGrid } from '@/components/store/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/store/product/ProductGridSkeleton';
import { ProductFilters } from '@/components/store/product/ProductFilters';
import { ProductSort } from '@/components/store/product/ProductSort';
import { Breadcrumb } from '@/components/store/layout/Breadcrumb';
import { PageTransition } from '@/components/shared/PageTransition';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  applyFilters,
  EMPTY_FILTERS,
  sortProducts,
  type FilterState,
  type SortOption,
} from '@/lib/specFilters';

interface Props {
  params: Promise<{
    slug: string[];
  }>;
}

// Collect the category name plus all descendant category names (via parentId chain)
function collectCategoryNames(
  categories: Category[],
  rootId: string
): string[] {
  const names: string[] = [];
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const cat = categories.find((c) => c._id === id);
    if (!cat) continue;
    names.push(cat.name);
    for (const c of categories) {
      if (c.parentId === id) stack.push(c._id);
    }
  }
  return names;
}

// Build the pagination item list (numbers + ellipsis gaps).
function pageItems(
  current: number,
  total: number
): (number | 'ellipsis-l' | 'ellipsis-r')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis-l' | 'ellipsis-r')[] = [1];
  if (current > 3) pages.push('ellipsis-l');
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('ellipsis-r');
  pages.push(total);
  return pages;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48, 75, 90];

export default function CategoryPage({ params }: Props) {
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<RawProduct[]>([]);
  const [filterSettings, setFilterSettings] = useState<ProductFilterSettings[]>(
    []
  );
  const [filters, setFilters] = useState<FilterState>({
    price: null,
    availability: [],
    rating: null,
    specs: {},
  });
  const [sort, setSort] = useState<SortOption>('featured');
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      const resolved = await params;
      setSlug(resolved.slug || []);
      try {
        const [cats, prodRes] = await Promise.all([
          categoriesResource.get(),
          productApi.getAll({ limit: 1000 }),
        ]);
        setCategories(cats || []);
        setProducts(prodRes?.data?.products || []);
        try {
          const filterRes = await productFilterApi.getAll();
          setFilterSettings(filterRes?.data?.settings || []);
        } catch (err) {
          console.error('Failed to load product filter settings:', err);
        }
      } catch (err) {
        // leave empty on failure
        console.error('Failed to load category page data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params]);

  // Strip the optional "products" prefix segment (e.g. /products/all-pc -> ["products", "all-pc"])
  const path = slug[0] === 'products' ? slug.slice(1) : slug;

  // Resolve each slug segment to a category; the last resolved one defines the scope
  let scopeId: string | null = null;
  let matchedCount = 0;
  const titleSegments: string[] = [];
  for (const segment of path) {
    const cat = categories.find((c) => c.slug === segment.toLowerCase());
    if (!cat) break;
    scopeId = cat._id;
    titleSegments.push(cat.name);
    matchedCount += 1;
  }

  // A path is valid only when every segment resolves to a known category
  // (or it is the plain "All Products" page, i.e. empty path).
  const isValidPath = path.length === 0 || matchedCount === path.length;

  const scopeNames = useMemo(
    () => (scopeId ? new Set(collectCategoryNames(categories, scopeId)) : null),
    [categories, scopeId]
  );

  const scopedProducts = useMemo(
    () =>
      products
        .filter((p) => p.status !== 'draft')
        .filter((p) => {
          if (!scopeNames) return true;
          const names =
            p.categories && p.categories.length > 0
              ? p.categories
              : [p.category];
          return names.some((n) => scopeNames.has(n));
        })
        .map(toProductShape),
    [products, scopeNames]
  );
  const activeFilterSettings =
    filterSettings.find(
      (item) =>
        item.categoryId === (scopeId ?? 'all') &&
        (item.brand ?? '').trim().toLocaleLowerCase() ===
          (filters.specs.Brand?.length === 1
            ? filters.specs.Brand[0].toLocaleLowerCase()
            : '')
    ) ??
    filterSettings.find(
      (item) =>
        item.categoryId === (scopeId ?? 'all') && !(item.brand ?? '').trim()
    ) ??
    (filters.specs.Brand?.length === 1
      ? filterSettings.find(
          (item) =>
            item.categoryId === 'all' &&
            (item.brand ?? '').trim().toLocaleLowerCase() ===
              filters.specs.Brand[0].toLocaleLowerCase()
        )
      : undefined) ??
    filterSettings.find(
      (item) => item.categoryId === 'all' && !(item.brand ?? '').trim()
    ) ??
    null;

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
  }, [scopeId]);

  const filteredProducts = useMemo(
    () => sortProducts(applyFilters(scopedProducts, filters), sort),
    [scopedProducts, filters, sort]
  );

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(
    () =>
      filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredProducts, safePage, pageSize, page]
  );

  // Reset to first page whenever filters, sort, or page size change.
  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  if (loading) {
    return (
      <div className="max-w-7xl m-auto px-4 py-8">
        <div className="h-6 bg-gray-200 rounded w-64 mb-4" />
        <ProductGridSkeleton count={8} />
      </div>
    );
  }

  if (!isValidPath) {
    notFound();
  }

  const pageTitle =
    titleSegments.length > 0
      ? titleSegments.join(' > ')
      : path.length === 0
        ? 'All Products'
        : path
            .map(
              (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
            )
            .join(' > ');

  return (
    <PageTransition>
      <div className="max-w-7xl m-auto px-4 py-8">
        <Breadcrumb slug={path} />
        {/* Top filter / toolbar header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-gray-500 mt-1">
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'product' : 'products'} found
              {filteredProducts.length !== scopedProducts.length &&
                ` of ${scopedProducts.length}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
            {/* Show (page size) selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Show:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v || '12'))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="hidden h-5 w-px bg-gray-200 sm:block" />
            {/* Featured / price / newest / rating sort */}
            <ProductSort value={sort} onChange={setSort} />
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-24">
              <ProductFilters
                products={scopedProducts}
                filters={filters}
                onChange={setFilters}
                settings={activeFilterSettings}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Showing info */}
            <div className="mb-4 flex items-center justify-between border p-2 rounded-lg text-sm text-gray-600">
              <span>
                Showing{' '}
                {filteredProducts.length === 0
                  ? 0
                  : (safePage - 1) * pageSize + 1}
                –{Math.min(safePage * pageSize, filteredProducts.length)} of{' '}
                {filteredProducts.length}
              </span>
              <span className="hidden sm:inline">
                Page {safePage} of {totalPages}
              </span>
            </div>
            {filteredProducts.length > 0 ? (
              <ProductGrid products={paginatedProducts} columns={3} />
            ) : scopedProducts.length > 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <p className="text-xl text-gray-500">
                  No products match your filters.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      price: null,
                      availability: [],
                      rating: null,
                      specs: {},
                    })
                  }
                  className="text-blue-600 hover:underline mt-4 inline-block"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <p className="text-xl text-gray-500">
                  No products found in this category.
                </p>
                <a
                  href="/"
                  className="text-blue-600 hover:underline mt-4 inline-block"
                >
                  ← Back to Home
                </a>
              </div>
            )}

            {/* Bottom pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-10">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      className={
                        safePage === 1 ? 'pointer-events-none opacity-50' : ''
                      }
                    />
                  </PaginationItem>
                  {pageItems(safePage, totalPages).map((p, i) =>
                    p === 'ellipsis-l' || p === 'ellipsis-r' ? (
                      <PaginationItem key={`${p}-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === safePage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={
                        safePage === totalPages
                          ? 'pointer-events-none opacity-50'
                          : ''
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
