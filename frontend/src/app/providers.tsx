'use client';

import { ReactNode } from 'react';
import { useHydrated } from '@/hooks/useHydrated';
import { AuthProvider } from '@/context/AuthContext';

export function Providers({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();

  // Only render children after hydration to prevent mismatches
  if (!hydrated) {
    return null; // Or a loading skeleton
  }

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
