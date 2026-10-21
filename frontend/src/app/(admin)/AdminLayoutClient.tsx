'use client';

import { AccessDenied } from '@/components/AccessDenied';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ADMIN_ROUTE_DENIED_MESSAGE,
  canAccessRoute,
} from '@/lib/adminPermissions';
import { useAuth } from '@/store';
import { ADMIN_SNAPSHOT_ROLES } from '@/store/slices/auth.slice';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect } from 'react';

const ADMIN_ROLES = ADMIN_SNAPSHOT_ROLES;

// Skeleton shell shown while the session is being restored, so the admin
// area loads with a layout-accurate placeholder instead of a spinner.
function AdminSkeleton() {
  return (
    <div className="flex min-h-svh w-full bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 shrink-0 flex-col gap-4 border-r p-4 md:flex">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="mt-2 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-96 rounded-xl" />
          <Skeleton className="col-span-3 h-96 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AdminLayoutClient({
  children,
  brandName,
}: {
  children: React.ReactNode;
  brandName: string;
}) {
  const { user, isLoading, fetchUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useLayoutEffect(() => {
    document.title = `Admin | ${brandName}`;
  }, [pathname, brandName]);

  useEffect(() => {
    // Always revalidate the session in the background. When the store was
    // hydrated from the session snapshot this only refreshes `user`; when it
    // is a genuinely new session it performs the `/auth/me` bootstrap.
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/admin/login');
    } else if (!ADMIN_ROLES.includes(user.role)) {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  // The skeleton is only for sessions we have not resolved (or restored from
  // the snapshot) yet. While a validated user is present — even when a
  // background revalidation is in flight — the real page stays mounted.
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return <AdminSkeleton />;
  }

  // Per-page role gate: block insufficient roles with a popup instead of the page.
  if (!canAccessRoute(pathname, user.role)) {
    return (
      <AccessDenied
        title="Access denied"
        message={
          ADMIN_ROUTE_DENIED_MESSAGE[pathname] ||
          'You are not allowed to access this page.'
        }
      />
    );
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
