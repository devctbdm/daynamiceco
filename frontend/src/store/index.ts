import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './slices/auth.slice';
import { createCartSlice, CartSlice } from './slices/cart.slice';
import { createUISlice, UISlice } from './slices/ui.slice';
import { createCheckoutSlice, CheckoutSlice } from './slices/checkout.slice';
import {
  createCompareSlice,
  CompareSlice,
} from './slices/compare.slice';
import {
  createWishlistSlice,
  WishlistSlice,
} from './slices/wishlist.slice';

export type RootStore = AuthSlice & CartSlice & UISlice & CheckoutSlice & CompareSlice & WishlistSlice;

// Create the root store
export const useAppStore = create<RootStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createCartSlice(...args),
      ...createUISlice(...args),
      ...createCheckoutSlice(...args),
      ...createCompareSlice(...args),
      ...createWishlistSlice(...args),
    }),
    {
      name: 'appleitzone-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // ⚠️ Only persist the cart and UI settings (not auth, because we use HTTP-Only cookies)
      partialize: (state) => ({
        cart: {
          items: state.items,
          totalItems: state.totalItems,
          totalPrice: state.totalPrice,
        },
        ui: {
          isAdminSidebarOpen: state.isAdminSidebarOpen,
        },
        checkout: {
          shippingAddress: state.shippingAddress,
          paymentMethod: state.paymentMethod,
          step: state.step,
        },
        compare: {
          compareItems: state.compareItems,
        },
        wishlist: {
          wishlist: state.wishlist,
        },
      }),
      merge: (persistedState: any, currentState: RootStore) => {
        return {
          ...currentState,
          ...(persistedState?.cart || {}),
          ...(persistedState?.ui || {}),
          ...(persistedState?.checkout || {}),
          ...(persistedState?.compare || {}),
          ...(persistedState?.wishlist || {}),
        };
      },
    }
  )
);

// 🔥 Export individual hooks for better performance (selectors)
export const useAuth = () => {
  const user = useAppStore((state) => state.user);
  const isLoading = useAppStore((state) => state.isLoading);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const login = useAppStore((state) => state.login);
  const register = useAppStore((state) => state.register);
  const logout = useAppStore((state) => state.logout);
  const fetchUser = useAppStore((state) => state.fetchUser);
  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser,
  };
};

export const useCart = () => {
  const items = useAppStore((state) => state.items);
  const totalItems = useAppStore((state) => state.totalItems);
  const totalPrice = useAppStore((state) => state.totalPrice);
  const cartLoading = useAppStore((state) => state.cartLoading);
  const addItem = useAppStore((state) => state.addItem);
  const removeItem = useAppStore((state) => state.removeItem);
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const clearCart = useAppStore((state) => state.clearCart);
  const fetchCart = useAppStore((state) => state.fetchCart);
  const syncCartWithBackend = useAppStore((state) => state.syncCartWithBackend);
  return {
    items,
    totalItems,
    totalPrice,
    isLoading: cartLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    fetchCart,
    syncCartWithBackend,
  };
};

export const useUI = () => {
  const isAdminSidebarOpen = useAppStore((state) => state.isAdminSidebarOpen);
  const isCartDrawerOpen = useAppStore((state) => state.isCartDrawerOpen);
  const isCheckoutLoading = useAppStore((state) => state.isCheckoutLoading);
  const globalLoading = useAppStore((state) => state.globalLoading);
  const toast = useAppStore((state) => state.toast);
  const toggleAdminSidebar = useAppStore((state) => state.toggleAdminSidebar);
  const toggleCartDrawer = useAppStore((state) => state.toggleCartDrawer);
  const setCheckoutLoading = useAppStore((state) => state.setCheckoutLoading);
  const setGlobalLoading = useAppStore((state) => state.setGlobalLoading);
  const showToast = useAppStore((state) => state.showToast);
  const hideToast = useAppStore((state) => state.hideToast);
  return {
    isAdminSidebarOpen,
    isCartDrawerOpen,
    isCheckoutLoading,
    globalLoading,
    toast,
    toggleAdminSidebar,
    toggleCartDrawer,
    setCheckoutLoading,
    setGlobalLoading,
    showToast,
    hideToast,
  };
};

export const useCheckout = () => {
  const shippingAddress = useAppStore((state) => state.shippingAddress);
  const paymentMethod = useAppStore((state) => state.paymentMethod);
  const notes = useAppStore((state) => state.notes);
  const step = useAppStore((state) => state.step);
  const setShippingAddress = useAppStore((state) => state.setShippingAddress);
  const setPaymentMethod = useAppStore((state) => state.setPaymentMethod);
  const setNotes = useAppStore((state) => state.setNotes);
  const goToStep = useAppStore((state) => state.goToStep);
  const resetCheckout = useAppStore((state) => state.resetCheckout);
  return {
    shippingAddress,
    paymentMethod,
    notes,
    step,
    setShippingAddress,
    setPaymentMethod,
    setNotes,
    goToStep,
    resetCheckout,
  };
};

export const useCompare = () => {
  const compareItems = useAppStore((state) => state.compareItems);
  const addToCompare = useAppStore((state) => state.addToCompare);
  const removeFromCompare = useAppStore((state) => state.removeFromCompare);
  const clearCompare = useAppStore((state) => state.clearCompare);
  return {
    compareItems,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };
};

export const useWishlist = () => {
  const wishlist = useAppStore((state) => state.wishlist);
  const toggleWishlist = useAppStore((state) => state.toggleWishlist);
  const removeFromWishlist = useAppStore((state) => state.removeFromWishlist);
  const clearWishlist = useAppStore((state) => state.clearWishlist);
  return {
    wishlist,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
  };
};
