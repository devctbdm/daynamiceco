'use client';

import { AuthProvider } from '@/context/AuthContext';
import { useHydrated } from '@/hooks/useHydrated';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();

  // Only render children after hydration to prevent mismatches
  if (!hydrated) {
    return null; // Or a loading skeleton
  }

  return <AuthProvider>{children}</AuthProvider>;
}
