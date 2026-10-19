'use client';

import { useEffect, useState } from 'react';
import { storeSettingsResource } from '@/lib/resources';
import { formatMoney, getCurrencySymbol } from '@/utils/currency';

const DEFAULT_CURRENCY = 'BDT';

/** Invalidate the cached currency (call after changing it in Settings). */
export function invalidateCurrency() {
  storeSettingsResource.invalidate();
}

/**
 * Read the store's configured currency (Settings → Default Currency) and expose
 * a symbol plus a formatter so prices are never hardcoded.
 *
 * Backed by a shared resource, so many components use a single request.
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<string>(() => {
    const cached = storeSettingsResource.peek();
    return cached?.currency ? cached.currency.toUpperCase() : DEFAULT_CURRENCY;
  });

  useEffect(() => {
    let active = true;

    const apply = (value?: string) => {
      if (active) setCurrency(value || DEFAULT_CURRENCY);
    };

    const unsubscribe = storeSettingsResource.subscribe(() => {
      const cached = storeSettingsResource.peek();
      apply(cached?.currency ? cached.currency.toUpperCase() : undefined);
    });

    storeSettingsResource
      .get()
      .then((settings) => apply(settings?.currency?.toUpperCase()))
      .catch(() => apply(undefined));

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    currency,
    symbol: getCurrencySymbol(currency),
    format: (amount: number) => formatMoney(amount, currency),
  };
}

export default useCurrency;
