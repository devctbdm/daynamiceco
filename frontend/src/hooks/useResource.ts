'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Resource } from '@/lib/resource';

/**
 * Subscribe a component to a shared {@link Resource}.
 *
 * Renders instantly from cache when available and fetches once otherwise —
 * multiple components using the same resource share a single request, even
 * when they mount at the same time or remount on navigation.
 */
export function useResource<T>(
  resource: Resource<T>,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const [data, setData] = useState<T | undefined>(() => resource.peek());
  const [loading, setLoading] = useState<boolean>(
    enabled && resource.peek() === undefined
  );
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = resource.subscribe(() => {
      setData(resource.peek());
    });

    if (resource.peek() === undefined) setLoading(true);

    resource
      .get()
      .then((value) => {
        setData(value);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));

    return unsubscribe;
  }, [resource, enabled]);

  const refresh = useCallback(() => resource.get({ force: true }), [resource]);

  return { data, loading, error, refresh };
}

export default useResource;
