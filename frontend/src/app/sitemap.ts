import type { MetadataRoute } from 'next';
import { getApiBase } from '@/lib/apiConfig';

const API_BASE = getApiBase();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://appleitzone.com';

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/offers`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  const [prodData, catData, offerData] = await Promise.all([
    getJson(`${API_BASE}/products?limit=5000&status=active`),
    getJson(`${API_BASE}/categories`),
    getJson(`${API_BASE}/offers?limit=1000`),
  ]);

  if (prodData?.success && Array.isArray(prodData.products)) {
    for (const p of prodData.products) {
      if (!p?.slug || p.status === 'draft') continue;
      entries.push({
        url: `${SITE_URL}/product/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  if (catData?.success && Array.isArray(catData.categories)) {
    for (const c of catData.categories) {
      if (!c?.slug) continue;
      entries.push({
        url: `${SITE_URL}/products/${c.slug}`,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  if (offerData?.success && Array.isArray(offerData.offers)) {
    for (const o of offerData.offers) {
      if (!o?.slug) continue;
      entries.push({
        url: `${SITE_URL}/offers/${o.slug}`,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }

  return entries;
}
