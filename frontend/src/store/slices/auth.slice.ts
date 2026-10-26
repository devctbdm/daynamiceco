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
  setAuthenticatedUser: (user: User) => void;
  /** Restore the admin user from the session snapshot (instant refresh). */
  hydrateUserFromSession: () => boolean;
}

// Roles for which we keep the per-tab session snapshot. Non-admin users always
// go through the normal /auth/me bootstrap.
export const ADMIN_SNAPSHOT_ROLES = ['admin', 'super_admin', 'manager'];

const SNAPSHOT_KEY = 'admin_user_snapshot';

function isSnapshotWorthy(user: User | null): boolean {
  return (
    !!user &&
    typeof user.role === 'string' &&
    ADMIN_SNAPSHOT_ROLES.includes(user.role)
  );
}

/** Keep (or clear) the per-tab admin snapshot used for instant refreshes. */
function cacheAdminUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (isSnapshotWorthy(user)) {
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SNAPSHOT_KEY);
    }
  } catch {
    // sessionStorage can throw (private mode / disabled storage); ignore.
  }
}

/**
 * Read the admin snapshot for this tab. Only called on the client, at store
 * module init, so a browser refresh starts with the previous (still
 * server-validated in the background) admin session instead of the skeleton.
 */
export function readAdminUserSnapshot(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as User;
    return isSnapshotWorthy(user) ? user : null;
  } catch {
    return null;
  }
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => {
  let sessionRevision = 0;

  return {
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
          sessionRevision += 1;
          const user = response.data.user as User;
          // Refresh the shared session cache so other callers see the new user.
          meResource.set({ user });
          cacheAdminUser(user);
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
          sessionRevision += 1;
          const user = response.data.user as User;
          meResource.set({ user });
          cacheAdminUser(user);
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
      sessionRevision += 1;
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } finally {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mobile_token');
          document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
        }
        meResource.set({ user: null });
        cacheAdminUser(null);
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
      const requestRevision = sessionRevision;
      if (!get().user && meResource.peek() === undefined) {
        set({ isLoading: true });
      }
      try {
        const { user } = await meResource.get();
        if (requestRevision !== sessionRevision) {
          meResource.set({ user: get().user });
          return;
        }
        cacheAdminUser(user);
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      } catch {
        if (requestRevision !== sessionRevision) {
          meResource.set({ user: get().user });
          return;
        }
        cacheAdminUser(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    setAuthenticatedUser: (user) => {
      sessionRevision += 1;
      meResource.set({ user });
      cacheAdminUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    },

    hydrateUserFromSession: () => {
      const user = readAdminUserSnapshot();
      if (user) {
        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      }
      return false;
    },
  };
};
