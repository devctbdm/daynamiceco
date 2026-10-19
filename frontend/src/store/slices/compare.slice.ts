// src/store/slices/compare.slice.ts
import { StateCreator } from 'zustand';

export const MAX_COMPARE = 4;

export interface CompareItem {
  _id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  discountPrice: number;
  stock: number;
  status: string;
  averageRating: number;
}

export interface CompareSlice {
  compareItems: CompareItem[];
  addToCompare: (item: CompareItem) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
}

export const createCompareSlice: StateCreator<CompareSlice> = (set) => ({
  compareItems: [],

  addToCompare: (item) =>
    set((state) => {
      if (state.compareItems.length >= MAX_COMPARE) return state;
      if (state.compareItems.some((i) => i._id === item._id)) return state;
      return { compareItems: [...state.compareItems, item] };
    }),

  removeFromCompare: (id) =>
    set((state) => ({
      compareItems: state.compareItems.filter((i) => i._id !== id),
    })),

  clearCompare: () => set({ compareItems: [] }),
});
