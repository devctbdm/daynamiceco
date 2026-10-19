import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchProductBySlug, fetchCategories, fetchAllProducts } from '@/lib/serverApi';
import { toProductShape, type RawProduct } from '@/lib/productMapper';
import type { Category } from '@/lib/api';
import type { Product } from '@/types/product';
import ProductDetail from '../ProductDetail';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://appleitzone.com';

interface Props {
  params: Promise<{ slug: string }>;
}

// Walk up the parentId chain to build the root -> leaf category list
function categoryChain(categories: Category[], name: string): Category[] {
  const cat = categories.find((c) => c.name === name);
  if (!cat) return [];
  const chain: Category[] = [];
  let current: Category | undefined = cat;
  while (current) {
    chain.unshift(current);
    current = categories.find((c) => c._id === current!.parentId);
  }
  return chain;
}

function buildProductJsonLd(product: Product) {
  const price = product.discountPrice > 0 ? product.discountPrice : product.price;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.seo?.metaDescription || product.description || product.name,
    image: product.images || [],
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.productCode ? { sku: product.productCode } : {}),
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'BDT',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/product/${product.slug}`,
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const raw = await fetchProductBySlug(slug);
  if (!raw) {
    return {
      title: 'Product not found',
      robots: { index: false, follow: false },
    };
  }
  const product = toProductShape(raw as RawProduct);
  const title = product.seo?.metaTitle || `${product.name} | Apple IT Zone`;
  const description =
    product.seo?.metaDescription || product.description || product.name;
  const image = product.images?.[0];

  return {
    title,
    description,
    alternates: {
      canonical: product.seo?.canonical || `${SITE_URL}/product/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/product/${product.slug}`,
      type: 'website',
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const raw = await fetchProductBySlug(slug);
  if (!raw) notFound();

  const [categories, allProducts] = await Promise.all([
    fetchCategories(),
    fetchAllProducts(),
  ]);

  const product = toProductShape(raw as RawProduct);
  const primaryName =
    raw.categories && raw.categories.length > 0
      ? raw.categories[0]
      : raw.category;
  const chain = categoryChain(categories as Category[], primaryName);
  const categorySlugs = chain.map((c) => c.slug);
  const categoryPath = chain.map((c) => c.name);

  const related = (allProducts as RawProduct[])
    .filter(
      (p) =>
        p._id !== raw._id &&
        p.status !== 'draft' &&
        (p.categories || [p.category]).includes(primaryName)
    )
    .slice(0, 4)
    .map((p) => toProductShape(p));

  const jsonLd = buildProductJsonLd(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail
        product={product}
        related={related}
        categorySlugs={categorySlugs}
        categoryPath={categoryPath}
      />
    </>
  );
}
