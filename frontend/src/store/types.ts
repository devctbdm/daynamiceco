export interface CartItem {
  productId: string;
  name: string;
  price: number;
  promoDiscount: number; // Per-unit discount from the product's sale price
  quantity: number;
  image: string;
  stock: number; // Max available
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface CheckoutData {
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  notes?: string;
}
