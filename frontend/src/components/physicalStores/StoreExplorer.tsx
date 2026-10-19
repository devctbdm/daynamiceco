'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import StoreCard from './StoreCard';
import type { PhysicalStore } from '@/lib/api';

/** Build a lowercased search index for a store (name, area, phones…). */
const haystack = (store: PhysicalStore) =>
  [
    store.title,
    store.address,
    store.description,
    ...(store.phones || []).flatMap((p) => [p.label, p.number]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/**
 * Client-side store search — filters the (already server-rendered) list as the
 * customer types. No network requests, no extra data fetching.
 */
export default function StoreExplorer({ stores }: { stores: PhysicalStore[] }) {
  const [query, setQuery] = useState('');

  const tokens = useMemo(
    () => query.toLowerCase().trim().split(/\s+/).filter(Boolean),
    [query]
  );

  const filtered = useMemo(
    () =>
      tokens.length === 0
        ? stores
        : stores.filter((store) => {
            const text = haystack(store);
            return tokens.every((token) => text.includes(token));
          }),
    [stores, tokens]
  );

  const trimmed = query.trim();

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by area, city or branch name…"
          aria-label="Search stores"
          className="h-12 w-full rounded-full border bg-background pl-12 pr-12 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'store' : 'stores'} found
        {trimmed ? ` for “${trimmed}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No stores found{trimmed ? ` for “${trimmed}”` : ''}. Try another area
          or city.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <StoreCard key={store._id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
