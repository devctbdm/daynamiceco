// src/store/slices/wishlist.slice.ts
import { StateCreator } from 'zustand';

export interface WishlistItem {
  _id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  discountPrice: number;
  stock: number;
  averageRating: number;
}

export interface WishlistSlice {
  wishlist: WishlistItem[];
  toggleWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  clearWishlist: () => void;
}

export const createWishlistSlice: StateCreator<WishlistSlice> = (set) => ({
  wishlist: [],

  toggleWishlist: (item) =>
    set((state) => ({
      wishlist: state.wishlist.some((i) => i._id === item._id)
        ? state.wishlist.filter((i) => i._id !== item._id)
        : [...state.wishlist, item],
    })),

  removeFromWishlist: (id) =>
    set((state) => ({
      wishlist: state.wishlist.filter((i) => i._id !== id),
    })),

  clearWishlist: () => set({ wishlist: [] }),
});
