'use client';

import { useStoreStatus } from '@/components/store/StoreStatusProvider';
import { useAuth } from '@/store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Always allow access to auth pages during maintenance so the super admin can
// log back in (they are redirected to the dashboard right after login).
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { maintenanceEnabled: enabled } = useStoreStatus();

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    // Wait for auth to resolve so super admins aren't redirected mid-load
    if (
      enabled &&
      !isLoading &&
      !isSuperAdmin &&
      !AUTH_ROUTES.includes(pathname) &&
      pathname !== '/maintenance'
    ) {
      router.replace('/maintenance');
    }
  }, [enabled, isLoading, isSuperAdmin, pathname, router]);

  return <>{children}</>;
}
