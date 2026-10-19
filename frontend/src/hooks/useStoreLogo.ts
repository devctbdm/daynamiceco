'use client';

import { useEffect, useState } from 'react';
import { storePublicResource } from '@/lib/resources';
import type { StoreSettings } from '@/lib/api';

export type StoreLogo = {
  logoType: 'text' | 'image';
  logoUrl: string;
  logoText: string;
  logoSubText: string;
  logoIconUrl: string;
  storeName: string;
};

const DEFAULT_LOGO: StoreLogo = {
  logoType: 'text',
  logoUrl: '',
  logoText: '',
  logoSubText: '',
  logoIconUrl: '',
  storeName: '',
};

export const STORE_LOGO_EVENT = 'store-logo-updated';

function normalize(settings?: StoreSettings): StoreLogo {
  return {
    logoType: settings?.logoType === 'image' ? 'image' : 'text',
    logoUrl: settings?.logoUrl || '',
    logoText: settings?.logoText || '',
    logoSubText: settings?.logoSubText || '',
    logoIconUrl: settings?.logoIconUrl || '',
    storeName: settings?.storeName || '',
  };
}

/** Drop the cached store info and refetch on the next read. */
export function invalidateStoreLogo() {
  storePublicResource.invalidate();
}

export function useStoreLogo() {
  const cached = storePublicResource.peek();
  const [logo, setLogo] = useState<StoreLogo>(
    cached ? normalize(cached) : DEFAULT_LOGO
  );

  useEffect(() => {
    let active = true;

    const apply = (settings?: StoreSettings) => {
      if (active) setLogo(normalize(settings));
    };

    // Re-render whenever the shared store-public cache changes.
    const unsubscribe = storePublicResource.subscribe(() => {
      apply(storePublicResource.peek());
    });

    storePublicResource
      .get()
      .then(apply)
      .catch(() => {
        if (active) setLogo(DEFAULT_LOGO);
      });

    // Settings saves dispatch this event to force a fresh read.
    const reload = () => {
      storePublicResource
        .get({ force: true })
        .then(apply)
        .catch(() => {});
    };
    window.addEventListener(STORE_LOGO_EVENT, reload);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener(STORE_LOGO_EVENT, reload);
    };
  }, []);

  return logo;
}
