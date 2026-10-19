// src/components/store/product/ProductGrid.tsx
'use client';

import { motion } from 'motion/react';
import { fadeInStagger, fadeInItem } from '@/lib/animations';
import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4 | 5;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  columns = 4,
}) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products found.</p>
      </div>
    );
  }

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <motion.div
      variants={fadeInStagger}
      initial="hidden"
      animate="visible"
      className={`grid ${gridCols[columns]} gap-4 md:gap-6`}
    >
      {products.map((product) => (
        <motion.div key={product._id} variants={fadeInItem}>
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
};
