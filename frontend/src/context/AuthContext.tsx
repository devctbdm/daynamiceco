'use client';

import { createContext, ReactNode } from 'react';
import { useAuth as useStoreAuth } from '@/store';

/**
 * Legacy auth context. It no longer performs its own `/auth/me` request — the
 * zustand auth store is the single source of truth (see AuthSlice.fetchUser,
 * backed by the shared `meResource`). This adapter keeps the `useAuth()` hook
 * and `<AuthProvider>` API working for the few callers that still use it.
 */

export interface AuthContextType {
  user: ReturnType<typeof useStoreAuth>['user'];
  loading: boolean;
  login: ReturnType<typeof useStoreAuth>['login'];
  register: ReturnType<typeof useStoreAuth>['register'];
  logout: ReturnType<typeof useStoreAuth>['logout'];
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { user, isLoading, login, register, logout } = useStoreAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{ user, loading: isLoading, login, register, logout, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};
