'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useStoreLogo } from '@/hooks/useStoreLogo';

const Logo = () => {
  const cfg = useStoreLogo();
  const label = cfg.logoText || cfg.storeName || 'Apple IT Zone';

  // Image logo: render the uploaded image on its own.
  if (cfg.logoType === 'image' && cfg.logoUrl) {
    return (
      <Link href="/" className="flex items-center">
        <span className="relative block h-10 w-32 sm:h-11 sm:w-40">
          <Image
            src={cfg.logoUrl}
            alt={label}
            fill
            priority
            className="object-contain object-left"
            sizes="160px"
          />
        </span>
      </Link>
    );
  }

  // Text logo (default): optional icon + text + optional sub text.
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="relative block h-10 w-10 shrink-0">
        <Image
          src={cfg.logoIconUrl || '/Apple.svg'}
          alt={label}
          fill
          priority
          className="object-contain"
          sizes="40px"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-white sm:text-xl">
          {label}
        </span>
        {cfg.logoSubText && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-400">
            {cfg.logoSubText}
          </span>
        )}
      </span>
    </Link>
  );
};

export default Logo;
