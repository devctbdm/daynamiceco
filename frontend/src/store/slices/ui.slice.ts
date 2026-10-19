// src/store/slices/ui.slice.ts
import { StateCreator } from 'zustand';
import { toast } from 'sonner';

export interface UISlice {
  isAdminSidebarOpen: boolean;
  isCartDrawerOpen: boolean;
  isCheckoutLoading: boolean;
  globalLoading: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  toggleAdminSidebar: () => void;
  toggleCartDrawer: () => void;
  setCheckoutLoading: (loading: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  isAdminSidebarOpen: false,
  isCartDrawerOpen: false,
  isCheckoutLoading: false,
  globalLoading: false,
  toast: null,

  toggleAdminSidebar: () =>
    set((state) => ({ isAdminSidebarOpen: !state.isAdminSidebarOpen })),

  toggleCartDrawer: () =>
    set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),

  setCheckoutLoading: (loading: boolean) => set({ isCheckoutLoading: loading }),

  setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),

  showToast: (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'error') toast.error(message);
    else if (type === 'success') toast.success(message);
    else toast.info(message);
    set({ toast: { message, type } });
  },

  hideToast: () => set({ toast: null }),
});
