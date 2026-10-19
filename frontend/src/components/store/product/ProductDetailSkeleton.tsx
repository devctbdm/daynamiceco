'use client';

import { motion } from 'motion/react';
import { pulse } from '@/lib/animations';

export const ProductDetailSkeleton: React.FC = () => {
  return (
    <motion.div
      variants={pulse}
      initial="initial"
      animate="animate"
      className="container mx-auto px-4 py-8"
    >
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 bg-gray-200 rounded w-16" />
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image skeleton */}
        <div className="aspect-square bg-gray-200 rounded-2xl" />

        {/* Details skeleton */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>

          {/* Rating skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>

          {/* Price skeleton */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 bg-gray-200 rounded w-32" />
              <div className="h-6 bg-gray-200 rounded w-24" />
            </div>
          </div>

          {/* Description skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>

          {/* Specifications skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex py-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3 ml-4" />
              </div>
            ))}
          </div>

          {/* Button skeleton */}
          <div className="h-12 bg-gray-200 rounded-lg w-full" />
        </div>
      </div>
    </motion.div>
  );
};
