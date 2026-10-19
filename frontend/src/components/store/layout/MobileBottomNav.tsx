// src/components/store/layout/MobileBottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tag, Sparkles, Cpu, Scale, User } from 'lucide-react';
import { useCompare } from '@/store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Offers', href: '/offers', Icon: Tag },
  { label: 'Holiday', href: '/holiday', Icon: Sparkles },
  { label: 'PC Builder', href: '/pc-builders', Icon: Cpu },
  { label: 'Compare', href: '/product/compare', Icon: Scale },
  { label: 'Account', href: '/accounts', Icon: User },
] as const;

const MobileBottomNav = () => {
  const pathname = usePathname();
  const { compareItems } = useCompare();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                active
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {href === '/product/compare' && compareItems.length > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {compareItems.length}
                  </span>
                )}
              </span>
              <span>{label}</span>
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
