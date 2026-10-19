// src/lib/productMapper.ts
import type { Product } from '@/types/product';

export type RawProduct = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number;
  category: string;
  categories?: string[];
  productCode?: string;
  brand?: string;
  images: string[];
  imageAlts?: string[];
  stock: number;
  status: string;
  featured: boolean;
  specifications: Record<string, any>;
  content?: string | any[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
    canonical?: string;
  };
  ratings: any[];
  averageRating: number;
  createdAt: string;
  updatedAt: string;
};

export function toProductShape(p: RawProduct): Product {
  return {
    _id: p._id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: p.price || 0,
    discountPrice: p.discountPrice || 0,
    category: p.category || '',
    path: [],
    productCode: p.productCode || '',
    brand: p.brand || '',
    images: p.images || [],
    imageAlts: p.imageAlts || [],
    stock: p.stock ?? 0,
    featured: !!p.featured,
    specifications: p.specifications || {},
    content: p.content || [],
    seo: p.seo || {},
    averageRating: p.averageRating || 0,
    ratings: p.ratings || [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
