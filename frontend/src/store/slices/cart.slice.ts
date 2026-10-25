// src/store/slices/cart.slice.ts
import { StateCreator } from 'zustand';
import { CartItem } from '../types';
import { apiFetch } from '@/lib/http';

const isBrowser = () => typeof window !== 'undefined';

// Matches the API client auth behavior: a stored token = logged-in (server will accept the request)
const isAuthed = () => isBrowser() && !!localStorage.getItem('mobile_token');

// Map backend cart items -> local CartItem shape
const mapServerItems = (items: any[]): CartItem[] =>
  (items || []).map((i: any) => ({
    productId: i.product?._id ?? i.product,
    variantId: i.variantId || undefined,
    variantLabel: i.variantLabel || '',
    sku: i.sku || '',
    name: i.name,
    price: i.price,
    promoDiscount: i.promoDiscount || 0,
    quantity: i.quantity,
    image: i.image,
    stock: i.stock ?? i.product?.stock ?? 0,
  }));

const sameCartItem = (
  item: CartItem,
  productId: string,
  variantId?: string
) =>
  item.productId === productId &&
  (item.variantId || '') === (variantId || '');

export interface CartSlice {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  cartLoading: boolean;
  error: string | null;

  // Helper
  recalculateTotals: (items: CartItem[]) => {
    totalItems: number;
    totalPrice: number;
  };

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (
    product: Omit<CartItem, 'quantity'> & { quantity?: number }
  ) => Promise<void>;
  removeItem: (productId: string, variantId?: string) => Promise<void>;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  syncCartWithBackend: () => Promise<void>; // Merge guest cart after login
}

export const createCartSlice: StateCreator<CartSlice> = (set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,
  cartLoading: false,
  error: null,

  // Helper: Recalculate totals
  recalculateTotals: (items: CartItem[]) => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return { totalItems, totalPrice };
  },

  fetchCart: async () => {
    if (!isAuthed()) return;
    set({ cartLoading: true, error: null });
    try {
      const response = await apiFetch('/cart');
      if (response.data.success) {
        const items = mapServerItems(
          response.data.cart?.items ?? response.data.items ?? []
        );
        const { totalItems, totalPrice } = get().recalculateTotals(items);
        set({ items, totalItems, totalPrice, cartLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, cartLoading: false });
    }
  },

  addItem: async (product) => {
    const { items } = get();
    const existingIndex = items.findIndex(
      (item) => sameCartItem(item, product.productId, product.variantId)
    );

    let newItems: CartItem[];
    if (existingIndex > -1) {
      // Update existing quantity
      newItems = items.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: item.quantity + (product.quantity || 1) }
          : item
      );
    } else {
      // Add new item
      const newItem: CartItem = {
        ...product,
        quantity: product.quantity || 1,
      };
      newItems = [...items, newItem];
    }

    const { totalItems, totalPrice } = get().recalculateTotals(newItems);
    set({ items: newItems, totalItems, totalPrice });

    // Guests stay local (persisted in localStorage). Logged-in users persist to the server.
    if (!isAuthed()) return;

    try {
      const response = await apiFetch('/cart', {
        method: 'POST',
        body: {
          productId: product.productId,
          variantId: product.variantId || '',
          name: product.name,
          price: product.price,
          promoDiscount: product.promoDiscount || 0,
          quantity: product.quantity || 1,
          image: product.image || '',
        },
      });
      if (response.data.success && response.data.cart) {
        const serverItems = mapServerItems(response.data.cart.items);
        const totals = get().recalculateTotals(serverItems);
        set({ items: serverItems, ...totals });
      }
    } catch (error) {
      console.error('Failed to sync cart to server:', error);
      const totals = get().recalculateTotals(items);
      set({ items, ...totals });
      throw error;
    }
  },

  removeItem: async (productId: string, variantId?: string) => {
    const newItems = get().items.filter(
      (item) => !sameCartItem(item, productId, variantId)
    );
    const { totalItems, totalPrice } = get().recalculateTotals(newItems);
    set({ items: newItems, totalItems, totalPrice });

    if (!isAuthed()) return;

    try {
      const response = await apiFetch('/cart/item', {
        method: 'DELETE',
        body: { productId, variantId: variantId || '' },
      });
      if (response.data.success && response.data.cart) {
        const serverItems = mapServerItems(response.data.cart.items);
        const totals = get().recalculateTotals(serverItems);
        set({ items: serverItems, ...totals });
      }
    } catch (error) {
      console.error('Failed to sync cart to server:', error);
    }
  },

  updateQuantity: async (
    productId: string,
    quantity: number,
    variantId?: string
  ) => {
    if (quantity <= 0) {
      await get().removeItem(productId, variantId);
      return;
    }
    const newItems = get().items.map((item) =>
      sameCartItem(item, productId, variantId)
        ? { ...item, quantity }
        : item
    );
    const { totalItems, totalPrice } = get().recalculateTotals(newItems);
    set({ items: newItems, totalItems, totalPrice });

    if (!isAuthed()) return;

    try {
      const response = await apiFetch('/cart', {
        method: 'PUT',
        body: { productId, variantId: variantId || '', quantity },
      });
      if (response.data.success && response.data.cart) {
        const serverItems = mapServerItems(response.data.cart.items);
        const totals = get().recalculateTotals(serverItems);
        set({ items: serverItems, ...totals });
      }
    } catch (error) {
      console.error('Failed to sync cart to server:', error);
    }
  },

  clearCart: async () => {
    set({ items: [], totalItems: 0, totalPrice: 0 });

    if (!isAuthed()) return;

    try {
      await apiFetch('/cart/clear', { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear cart on server:', error);
    }
  },

  syncCartWithBackend: async () => {
    // Merge the guest (local) cart into the server cart after login
    if (!isAuthed()) return;

    const { items } = get();
    if (items.length === 0) {
      await get().fetchCart();
      return;
    }

    try {
      for (const item of items) {
        await apiFetch('/cart', {
          method: 'POST',
          body: {
            productId: item.productId,
            variantId: item.variantId || '',
            name: item.name,
            price: item.price,
            promoDiscount: item.promoDiscount || 0,
            quantity: item.quantity,
            image: item.image || '',
          },
        });
      }
      await get().fetchCart();
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  },
});
