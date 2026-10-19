'use client';

import { motion } from 'motion/react';
import { pulse } from '@/lib/animations';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <motion.div
      variants={pulse}
      initial="initial"
      animate="animate"
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
    >
      {/* Image skeleton */}
      <div className="relative h-48 md:h-56 w-full bg-gray-200" />

      {/* Content skeleton */}
      <div className="p-4 md:p-5 space-y-3">
        {/* Title skeleton */}
        <div className="h-5 bg-gray-200 rounded w-3/4" />

        {/* Description skeleton */}
        <div className="space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>

        {/* Price skeleton */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>

        {/* Button skeleton */}
        <div className="h-10 bg-gray-200 rounded-lg w-full mt-2" />
      </div>
    </motion.div>
  );
};
