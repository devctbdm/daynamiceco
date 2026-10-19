// src/components/store/layout/StoreQuickActions.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, ShoppingCart } from 'lucide-react';
import { useCart, useCompare, useUI } from '@/store';
import { CompareDialog } from '@/components/store/compare/CompareDialog';
import { CartDrawer } from '@/components/store/cart/CartDrawer';

export const StoreQuickActions = () => {
  const { compareItems } = useCompare();
  const { totalItems } = useCart();
  const { toggleCartDrawer } = useUI();
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <>
      <div className="fixed right-6 bottom-6 z-40 hidden flex-col items-center gap-3 lg:flex">
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          aria-label="Compare products"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-blue-600"
        >
          <Scale size={22} />
          {compareItems.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {compareItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={toggleCartDrawer}
          aria-label="Open cart"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-blue-600"
        >
          <ShoppingCart size={22} />
          <AnimatePresence mode="popLayout" initial={false}>
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ opacity: 0, scale: 0.4, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.4, y: -4 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white"
              >
                {totalItems}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} />
      <CartDrawer />
    </>
  );
};

export default StoreQuickActions;
