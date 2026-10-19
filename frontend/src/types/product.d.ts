// src/types/product.types.ts
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
  brand?: string;
  images: string[];
  imageAlts?: string[];
  stock: number;
  featured: boolean;
  specifications?: Record<string, any>;
  content?: string | any[];
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
