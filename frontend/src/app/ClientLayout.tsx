// src/app/ClientLayout.tsx
'use client';

import { useAuth } from '@/store';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, fetchUser } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <div key={pathname} className="min-h-screen">
      {children}
    </div>
  );
}
