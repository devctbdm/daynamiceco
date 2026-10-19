// src/store/slices/auth.slice.ts
import { StateCreator } from 'zustand';
import { User, LoginCredentials, RegisterCredentials } from '@/types/user';
import { apiFetch } from '@/lib/http';
import { meResource } from '@/lib/resources';

export interface AuthSlice {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: credentials,
      });
      if (response.data.success) {
        const user = response.data.user as User;
        // Refresh the shared session cache so other callers see the new user.
        meResource.set({ user });
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  register: async (credentials: RegisterCredentials) => {
    set({ isLoading: true });
    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: credentials,
      });
      if (response.data.success) {
        const user = response.data.user as User;
        meResource.set({ user });
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      meResource.set({ user: null });
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  /**
   * Resolve the current session user. Backed by the shared `meResource`, so
   * multiple callers on the same page load (ClientLayout, RequireAuth, ...)
   * produce a single `/auth/me` request.
   */
  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const { user } = await meResource.get();
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
});
