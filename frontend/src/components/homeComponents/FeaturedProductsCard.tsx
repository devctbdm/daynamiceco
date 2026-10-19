// src/components/storefront/FeaturedProductsCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { formatBDT } from '@/utils/currency';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------
export interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  images: string[];
  isFeatured?: boolean;
  category?: {
    name: string;
    slug: string;
  };
}

interface FeaturedProductsCardProps {
  product: FeaturedProduct;
  className?: string;
  imageHeight?: number;
  imageWidth?: number;
  priority?: boolean;
  showCategory?: boolean;
  isLoading?: boolean;
}

// ------------------------------------------------------------
// SKELETON LOADER
// ------------------------------------------------------------
export function FeaturedProductsCardSkeleton({
  className,
  imageHeight = 200,
}: {
  className?: string;
  imageHeight?: number;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-white shadow-sm',
        className
      )}
    >
      {/* Image Skeleton */}
      <div
        className="relative w-full overflow-hidden bg-gray-100"
        style={{ height: imageHeight }}
      >
        <Skeleton className="h-full w-full" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3 p-4">
        {/* Title */}
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />

        {/* Price */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Savings */}
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------
export function FeaturedProductsCard({
  product,
  className,
  imageHeight = 200,
  imageWidth = 300,
  priority = false,
  showCategory = false,
  isLoading = false,
}: FeaturedProductsCardProps) {
  // Show skeleton while loading
  if (isLoading) {
    return (
      <FeaturedProductsCardSkeleton
        className={className}
        imageHeight={imageHeight}
      />
    );
  }

  // Calculate discount percentage
  const discountPercentage = product.comparePrice
    ? Math.round(
        ((product.comparePrice - product.price) / product.comparePrice) * 100
      )
    : 0;

  const hasDiscount = discountPercentage > 0;

  // Calculate savings amount
  const savingsAmount = product.comparePrice
    ? product.comparePrice - product.price
    : 0;

  // Get the first image or use a placeholder
  const imageUrl = product.images?.[0] || '/images/placeholder-product.jpg';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-300 hover:shadow-lg',
        className
      )}
    >
      {/* ------------------------------------------------------------
          IMAGE CONTAINER
          ------------------------------------------------------------ */}
      <Link
        href={`/product/${product.slug}`}
        className="flex justify-center items-center overflow-hidden"
      >
        <div
          className="relative h-48 w-48 overflow-hidden bg-gray-100"
          style={{ height: imageHeight }}
        >
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={`(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${imageWidth}px`}
            priority={priority}
          />
        </div>
      </Link>

      {/* ------------------------------------------------------------
          OFFER BADGE (Percentage)
          ------------------------------------------------------------ */}
      {hasDiscount && (
        <div className="absolute left-3 top-3 z-10">
          <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-md">
            -{discountPercentage}%
          </span>
        </div>
      )}

      {!hasDiscount && product.isFeatured && (
        <div className="absolute left-3 top-3 z-10">
          <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-md">
            Featured
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------
          CATEGORY BADGE (Optional)
          ------------------------------------------------------------ */}
      {showCategory && product.category && (
        <div className="absolute right-3 top-3 z-10">
          <span className="inline-flex items-center rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {product.category.name}
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------
          PRODUCT INFO
          ------------------------------------------------------------ */}
      <div className="p-4">
        {/* Title */}
        <Link href={`/product/${product.slug}`} className="block">
          <h3 className="line-clamp-2 text-sm font-medium text-gray-800 transition-colors hover:text-blue-600">
            {product.name}
          </h3>
        </Link>

        {/* Category (inline, optional) */}
        {showCategory && product.category && (
          <p className="mt-1 text-xs text-gray-400">{product.category.name}</p>
        )}

        {/* Price Section */}
        <div className="mt-2 flex items-baseline gap-2">
          {/* Current Price */}
          <span className="text-lg font-bold text-gray-900">
            {formatBDT(product.price)}
          </span>

          {/* Discount Price (strikethrough) */}
          {hasDiscount && product.comparePrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatBDT(product.comparePrice)}
            </span>
          )}
        </div>

        {/* Savings Text */}
        {hasDiscount && product.comparePrice && (
          <p className="mt-1 text-xs font-medium text-green-600">
            Save: {formatBDT(savingsAmount)} (-{discountPercentage}%)
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// GRID WRAPPER FOR MULTIPLE CARDS
// ------------------------------------------------------------
interface FeaturedProductsGridProps {
  products: FeaturedProduct[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  imageHeight?: number;
  showCategory?: boolean;
  isLoading?: boolean;
  skeletonCount?: number;
}

export function FeaturedProductsGrid({
  products,
  columns = 4,
  className,
  imageHeight = 200,
  showCategory = false,
  isLoading = false,
  skeletonCount = 8,
}: FeaturedProductsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  // Show skeletons while loading
  if (isLoading) {
    return (
      <div className={cn('grid gap-4', gridCols[columns], className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <FeaturedProductsCardSkeleton
            key={`skeleton-${index}`}
            imageHeight={imageHeight}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {products.map((product, index) => (
        <FeaturedProductsCard
          key={product.id}
          product={product}
          imageHeight={imageHeight}
          priority={index < 4}
          showCategory={showCategory}
        />
      ))}
    </div>
  );
}
