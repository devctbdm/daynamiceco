// src/app/(store)/search/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, PackageSearch } from 'lucide-react';
import { productApi } from '@/lib/api';
import { toProductShape, type RawProduct } from '@/lib/productMapper';
import { ProductGrid } from '@/components/store/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/store/product/ProductGridSkeleton';
import type { Product } from '@/types/product';

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.trim() ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!q) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    productApi
      .getAll({ search: q, limit: 1000 })
      .then(({ data }) => {
        if (cancelled) return;
        const raw = (data.products || []) as RawProduct[];
        const mapped = raw
          .filter((p) => p.status !== 'draft')
          .map(toProductShape);
        setProducts(mapped);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {q ? `Search results for "${q}"` : 'Search Products'}
        </h1>
        <p className="mt-1 text-gray-500">
          {q
            ? loading
              ? 'Searching products...'
              : `${products.length} ${
                  products.length === 1 ? 'product' : 'products'
                } found`
            : 'Type a keyword above to find products, brands and more.'}
        </p>
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length > 0 ? (
        <ProductGrid products={products} columns={4} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-20 text-center">
          {q ? (
            <>
              <PackageSearch className="h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-700">
                No products found
              </p>
              <p className="text-sm text-gray-500">
                We couldn&apos;t find anything matching &quot;{q}&quot;. Try a
                different keyword.
              </p>
            </>
          ) : (
            <>
              <Search className="h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-700">
                Start searching
              </p>
              <p className="text-sm text-gray-500">
                Use the search bar in the header to find products.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <SearchResults />
    </Suspense>
  );
}
