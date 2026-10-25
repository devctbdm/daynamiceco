// src/types/product.types.ts
export interface ProductVariant {
  _id?: string;
  color?: string;
  colorCode?: string;
  storage?: string;
  ram?: string;
  images?: string[];
  price?: number;
  discountPrice?: number;
  stock?: number;
  sku?: string;
  enabled?: boolean;
  attributes?: Record<string, any>;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number;
  category: string; // e.g., 'desktops', 'laptops', 'components'
  path?: string[]; // e.g., ['desktops', 'gaming', 'intel']
  productCode?: string;
  sku?: string;
  brand?: string;
  images: string[];
  imageAlts?: string[];
  stock: number;
  featured: boolean;
  specifications?: Record<string, any>;
  content?: string | any[];
  variants?: ProductVariant[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
    canonical?: string;
  };
  averageRating: number;
  ratings: Rating[];
  createdAt: string;
  updatedAt: string;
}
