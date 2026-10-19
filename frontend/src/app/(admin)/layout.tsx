import type { Metadata } from 'next';
import { cache } from 'react';
import { buildApiUrl } from '@/lib/apiConfig';
import AdminLayoutClient from './AdminLayoutClient';

export const dynamic = 'force-dynamic';

const FALLBACK_BRAND_NAME = 'AppleItZone';

const getBrandName = cache(async () => {
  try {
    const response = await fetch(buildApiUrl('/store/public'), {
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error(
        `Failed to load admin title brand name: ${response.status} ${response.statusText}`
      );
      return FALLBACK_BRAND_NAME;
    }

    const data: { settings?: { storeName?: unknown } } = await response.json();
    return typeof data.settings?.storeName === 'string' &&
      data.settings.storeName.trim()
      ? data.settings.storeName.trim()
      : FALLBACK_BRAND_NAME;
  } catch (error) {
    console.error('Failed to load admin title brand name', error);
    return FALLBACK_BRAND_NAME;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const brandName = await getBrandName();
  return {
    title: `Admin | ${brandName}`,
  };
}

export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brandName = await getBrandName();
  return (
    <AdminLayoutClient brandName={brandName}>{children}</AdminLayoutClient>
  );
}
