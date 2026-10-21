'use client';

import { categoryApi, popupOfferApi, storeApi, dashboardApi, notificationApi } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { createResource } from '@/lib/resource';
import type { Category, PopupOffer, StoreSettings, DashboardStats } from '@/lib/api';
import type { User } from '@/types/user';

/**
 * Shared client-side resources for data that many components need.
 *
 * Each resource is fetched at most once per TTL across the whole app, so
 * remounting components on navigation no longer produces duplicate requests.
 */

// Public store info (name, logo, contact). Changes rarely → cache 5 minutes.
export const storePublicResource = createResource<StoreSettings>(
  'store/public',
  async () => {
    const { data } = await storeApi.getPublic();
    return data.settings;
  },
  { ttlMs: 5 * 60_000 }
);

// Full store settings incl. currency (requires auth; used by the admin panel).
export const storeSettingsResource = createResource<StoreSettings>(
  'store/settings',
  async () => {
    const { data } = await storeApi.get();
    return data.settings;
  },
  { ttlMs: 5 * 60_000 }
);

// Category tree — one shared request for the desktop + mobile navs.
export const categoriesResource = createResource<Category[]>(
  'categories',
  async () => {
    const { data } = await categoryApi.getAll();
    return data.categories ?? [];
  },
  { ttlMs: 60_000 }
);

// Home popup offer — fetched once per session window.
export const popupOfferResource = createResource<PopupOffer>(
  'popup-offer',
  async () => {
    const { data } = await popupOfferApi.get();
    return data.popupOffer;
  },
  { ttlMs: 5 * 60_000 }
);

// Admin dashboard stats. Short TTL: collapses the duplicate requests fired by
// StrictMode double-mounts / quick navigations, without showing stale numbers.
export const dashboardStatsResource = createResource<DashboardStats>(
  'dashboard/stats',
  async () => {
    const { data } = await dashboardApi.getStats();
    return data.stats;
  },
  { ttlMs: 10_000 }
);

// Sidebar notification badge. The live counter keeps its own state between
// socket events; this only dedupes the repeated initial fetches. Invalidate
// whenever notifications are read (or created) elsewhere.
export const notificationUnreadResource = createResource<number>(
  'notifications/unread-count',
  async () => {
    const { data } = await notificationApi.unreadCount();
    return data.unreadCount;
  },
  { ttlMs: 15_000 }
);

/**
 * Current session user. `apiFetch('/auth/me')` is called from more than one
 * place (ClientLayout, RequireAuth, AuthContext) — this collapses them into a
 * single request and caches the result briefly. Call `invalidate()` after
 * login / register / logout.
 */
export const meResource = createResource<{ user: User | null }>(
  'auth/me',
  async () => {
    try {
      const { data } = await apiFetch<{ success: boolean; user: User }>(
        '/auth/me'
      );
      return { user: data?.success ? data.user : null };
    } catch {
      // Not signed in (401) — cache the guest state so we don't retry in a loop.
      return { user: null };
    }
  },
  { ttlMs: 15_000 }
);
