import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import StoreExplorer from '@/components/physicalStores/StoreExplorer';
import { RichTextView } from '@/components/RichTextView';
import { fetchPhysicalStores, fetchPhysicalStoreBanner } from '@/lib/serverApi';
import type { PhysicalStore } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Our Physical Stores',
  description:
    'Find your nearest Apple IT Zone branch — address, phone numbers, opening hours and directions.',
};

export default async function PhysicalStoresPage() {
  const [stores, banner] = await Promise.all([
    fetchPhysicalStores(),
    fetchPhysicalStoreBanner(),
  ]);

  const list = (stores || []) as PhysicalStore[];
  const count = list.length;
  const title = banner?.title || 'Physical Stores';
  const heading =
    banner?.showCount !== false && count > 0
      ? `${count}${banner?.countSuffix ?? '+'} ${title}`
      : title;
  const subtitle =
    banner?.subtitle || 'Visit our stores and get your desired IT product!';
  const description = banner?.description?.trim() || '';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <MapPin className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
        </div>
        {subtitle && (
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        )}
      </header>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No stores available yet.
        </div>
      ) : (
        <StoreExplorer stores={list} />
      )}

      {description && (
        <section className="mt-12 rounded-xl border bg-card p-6">
          <RichTextView html={description} />
        </section>
      )}
    </div>
  );
}
