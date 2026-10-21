// src/lib/serverApi.ts
// Server-only data fetching helpers for Server Components / metadata.
// Uses the built-in Next.js fetch() with caching/revalidation.
import { cache } from 'react';
import { getApiBase } from './apiConfig';
import { SERVICE_FINDER_CACHE_TAG } from './cacheTags';

const API_BASE = getApiBase();

// Public catalog data changes rarely; cache it with Next.js incremental
// revalidation instead of disabling cache entirely.
const REVALIDATE_SECONDS = 60;

async function getJson<T = any>(
  path: string,
  revalidate = REVALIDATE_SECONDS,
  tags: string[] = []
) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate, ...(tags.length ? { tags } : {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchProductBySlug = cache(async (slug: string) => {
  const data = await getJson<{ success: boolean; product: any }>(
    `/products/slug/${encodeURIComponent(slug)}`
  );
  return data?.success ? data.product : null;
});

export const fetchCategories = cache(async () => {
  const data = await getJson<{ categories: any[] }>('/categories');
  return data?.categories || [];
});

export const fetchAllProducts = cache(async () => {
  const data = await getJson<{ products: any[] }>('/products?limit=5000');
  return data?.products || [];
});

// Featured products for the home page.
export const fetchFeaturedProducts = cache(async (limit = 12) => {
  const data = await getJson<{ products: any[] }>(
    `/products?limit=${encodeURIComponent(String(limit))}`
  );
  return data?.products || [];
});

// Banner setting + active count for the home page banner (single request).
export const fetchPhysicalStoreBanner = cache(async () => {
  const data = await getJson<{ success: boolean; setting: any }>(
    '/physical-stores/setting'
  );
  return data?.success ? data.setting : null;
});

// Active physical stores for the /physical-stores page.
export const fetchPhysicalStores = cache(async () => {
  const data = await getJson<{ stores: any[] }>('/physical-stores?active=true');
  return data?.stores || [];
});

// Home page service finder cards (icon + title + subtitle), ordered.
// Tagged so /admin/service-finder can purge it on demand after an edit.
export const fetchServiceFinderItems = cache(async () => {
  const data = await getJson<{ items: any[] }>(
    '/service-finders?active=true',
    undefined,
    [SERVICE_FINDER_CACHE_TAG]
  );
  return data?.items || [];
});

// Section-level switch for the homepage service finder block.
export const fetchServiceFinderSetting = cache(async () => {
  const data = await getJson<{ setting: { enabled?: boolean } }>(
    '/service-finders/setting',
    undefined,
    [SERVICE_FINDER_CACHE_TAG]
  );
  return data?.setting ?? null;
});

// Active hero/ad sliders for the home page.
export const fetchActiveSliders = cache(async () => {
  const data = await getJson<{
    sliders: any[];
    setting?: { enabled?: boolean; autoSlide?: boolean; interval?: number };
  }>('/sliders?active=true', 10);
  return {
    sliders: data?.sliders || [],
    setting: data?.setting ?? null,
  };
});

// Active marquee notifications + whether the marquee is enabled.
export const fetchHomeSliderTexts = cache(async () => {
  const data = await getJson<{ texts: any[] }>(
    '/home-slider-texts?active=true'
  );
  return data?.texts || [];
});

export const fetchHomeSliderSetting = cache(async () => {
  const data = await getJson<{ setting: { enabled?: boolean } }>(
    '/home-slider-texts/setting'
  );
  return data?.setting ?? null;
});

// Free-form home page content block.
export const fetchHomeContent = cache(async () => {
  const data = await getJson<{
    homeContent: { content?: string; enabled?: boolean };
  }>('/home-content');
  return data?.homeContent ?? null;
});
