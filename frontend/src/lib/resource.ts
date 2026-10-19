'use client';

/**
 * Tiny module-level cache for client-side GET requests.
 *
 * Why this exists: pages and layout components remount on navigation (see the
 * keyed wrapper in ClientLayout) and several components ask for the same
 * public data (store info, categories, popup offer, ...). Without a shared
 * cache, every mount fired a fresh request. This helper removes that waste:
 *
 *   - concurrent callers share a single in-flight promise (dedupe)
 *   - repeat callers within `ttlMs` reuse the cached value
 *   - callers that need fresh data can `invalidate()` (after a write) or
 *     `get({ force: true })`
 *
 * It is intentionally tiny and dependency-free (no SWR / React Query), matching
 * the existing "module-level cache" pattern already used in this codebase.
 */

type Entry<T> = {
  data?: T;
  promise?: Promise<T>;
  ts: number;
};

const entries = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((cb) => cb());
}

export type Resource<T> = {
  readonly key: string;
  /** Resolve the value, reusing cache / in-flight request unless `force`. */
  get(opts?: { force?: boolean }): Promise<T>;
  /** Synchronously read the last cached value (undefined if none). */
  peek(): T | undefined;
  /** Overwrite the cache (e.g. right after a successful mutation). */
  set(data: T): void;
  /** Drop the cache so the next `get()` refetches. */
  invalidate(): void;
  /** Subscribe to cache changes; returns an unsubscribe function. */
  subscribe(cb: () => void): () => void;
};

export function createResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  { ttlMs = 60_000 }: { ttlMs?: number } = {}
): Resource<T> {
  const read = () => entries.get(key) as Entry<T> | undefined;

  return {
    key,

    get({ force = false } = {}) {
      const entry = read();
      const hasData = entry?.data !== undefined;
      const isFresh = hasData && Date.now() - entry!.ts < ttlMs;

      if (!force && isFresh) return Promise.resolve(entry!.data as T);
      if (!force && entry?.promise) return entry.promise;

      const promise = fetcher()
        .then((data) => {
          entries.set(key, { data, ts: Date.now() });
          notify(key);
          return data;
        })
        .catch((err) => {
          // Keep the last good value (stale-while-revalidate) and allow retry.
          if (hasData) {
            entries.set(key, { data: entry!.data, ts: entry!.ts });
          } else {
            entries.delete(key);
          }
          throw err;
        });

      entries.set(key, {
        data: entry?.data,
        promise,
        ts: entry?.ts ?? Date.now(),
      });

      return promise;
    },

    peek() {
      return read()?.data;
    },

    set(data) {
      entries.set(key, { data, ts: Date.now() });
      notify(key);
    },

    invalidate() {
      entries.delete(key);
      notify(key);
    },

    subscribe(cb) {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(cb);
      return () => {
        set!.delete(cb);
        if (set!.size === 0) listeners.delete(key);
      };
    },
  };
}
