'use client';

import { Eye, Lock } from 'lucide-react';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';

const DEFAULT_NOTICE =
  'Browsing only — you can view products, but buying is temporarily disabled.';

/**
 * Storefront notice shown at the top of every store page while the store is in
 * browse-only ("stop selling") mode. Purely informational; the actual block is
 * enforced in the cart/checkout UI and on the API.
 */
export default function StoreNoticeBanner() {
  const { buyingEnabled, maintenanceEnabled, sellingMessage } =
    useStoreStatus();

  // When full maintenance is on, visitors are redirected anyway.
  if (buyingEnabled || maintenanceEnabled) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <Lock className="h-4 w-4 shrink-0" />
      <span>{sellingMessage?.trim() || DEFAULT_NOTICE}</span>
      <Eye className="ml-1 hidden h-4 w-4 shrink-0 sm:inline" />
    </div>
  );
}
