'use client';

import { createContext, useContext } from 'react';
import { useMaintenance } from '@/hooks/use-maintenance';

export type StoreStatus = {
  loading: boolean;
  /** Full-site maintenance is on (visitors are redirected to /maintenance). */
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  /** False while the store is browse-only: see products, but cannot buy. */
  buyingEnabled: boolean;
  /** Optional custom notice shown while buying is disabled. */
  sellingMessage: string;
};

const DEFAULT_STATUS: StoreStatus = {
  loading: true,
  maintenanceEnabled: false,
  maintenanceMessage: '',
  buyingEnabled: true,
  sellingMessage: '',
};

const StoreStatusContext = createContext<StoreStatus>(DEFAULT_STATUS);

/**
 * Provides a single, shared maintenance/selling status to the storefront so we
 * don't spin up multiple polling loops. Wrap the store layout with this.
 */
export function StoreStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { enabled, sellingEnabled, sellingMessage, status, loading } =
    useMaintenance();

  const value: StoreStatus = {
    loading,
    maintenanceEnabled: enabled,
    maintenanceMessage: status?.message || '',
    buyingEnabled: sellingEnabled,
    sellingMessage,
  };

  return (
    <StoreStatusContext.Provider value={value}>
      {children}
    </StoreStatusContext.Provider>
  );
}

export const useStoreStatus = () => useContext(StoreStatusContext);

export default StoreStatusProvider;
