import { fetchPhysicalStoreBanner } from '@/lib/serverApi';
import { MapPin, Search } from 'lucide-react';
import Link from 'next/link';

/**
 * Home page physical-stores banner (server rendered — no client JS).
 * Copy, visibility and the store count are managed from /admin/physical-stores.
 */
const PhysicalStores = async () => {
  const banner = await fetchPhysicalStoreBanner();

  if (!banner || banner.enabled === false) return null;

  const showCount = banner.showCount !== false;
  const count = Number(banner.count) || 0;
  const title = banner.title || 'Physical Stores';
  const heading =
    showCount && count > 0
      ? `${count}${banner.countSuffix ?? '+'} ${title}`
      : title;
  const link = banner.buttonLink || '/physical-stores';

  return (
    <div className="relative my-12 overflow-hidden rounded-lg bg-linear-to-r from-slate-900 to-slate-700 px-4 py-12">
      {banner.bannerUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${banner.bannerUrl})` }}
        />
      )}

      <div className="relative flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <MapPin className="text-white" size={50} aria-hidden="true" />
          <div>
            <h2 className="text-3xl font-bold text-white lg:text-4xl">
              {heading}
            </h2>
            {banner.subtitle && <p className="text-white">{banner.subtitle}</p>}
          </div>
        </div>

        {banner.buttonLabel && link && (
          <Link
            href={link}
            className="flex items-center gap-x-4 rounded-full bg-linear-to-r from-violet-600 to-indigo-600 px-8 py-4 font-extrabold text-white transition-transform hover:scale-105"
          >
            {banner.buttonLabel} <Search size={20} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default PhysicalStores;
