// src/store/slices/checkout.slice.ts
import { StateCreator } from 'zustand';
import { ShippingAddress } from '../types';

export interface CheckoutSlice {
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  notes: string;
  step: 1 | 2 | 3; // 1: Address, 2: Payment, 3: Confirm

  setShippingAddress: (address: ShippingAddress) => void;
  setPaymentMethod: (method: string) => void;
  setNotes: (notes: string) => void;
  goToStep: (step: 1 | 2 | 3) => void;
  resetCheckout: () => void;
}

const defaultAddress: ShippingAddress = {
  street: '',
  city: 'Dhaka',
  state: 'Dhaka',
  postcode: '1000',
  country: 'Bangladesh',
};

export const createCheckoutSlice: StateCreator<CheckoutSlice> = (set) => ({
  shippingAddress: defaultAddress,
  paymentMethod: 'sslcommerz',
  notes: '',
  step: 1,

  setShippingAddress: (address: ShippingAddress) =>
    set({ shippingAddress: address }),
  setPaymentMethod: (method: string) =>
    set({ paymentMethod: method }),
  setNotes: (notes: string) => set({ notes }),
  goToStep: (step: 1 | 2 | 3) => set({ step }),
  resetCheckout: () =>
    set({
      shippingAddress: defaultAddress,
      paymentMethod: 'sslcommerz',
      notes: '',
      step: 1,
    }),
});
