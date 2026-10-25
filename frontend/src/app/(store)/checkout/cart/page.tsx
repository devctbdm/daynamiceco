// src/app/(store)/checkout/cart/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/store';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';
import { CartItemCard } from '@/components/store/cart/CartItem';
import { Button } from '@/components/button/Button';
import RequireAuth from '@/components/store/layout/RequireAuth';

const listSpring = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 28,
};

const CartContent = () => {
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { buyingEnabled, sellingMessage } = useStoreStatus();
  const router = useRouter();
  const [proceeding, setProceeding] = useState(false);

  const totalSavings = items.reduce(
    (sum, item) => sum + item.promoDiscount * item.quantity,
    0
  );
  const originalSubtotal = totalPrice + totalSavings;

  const handleProceed = () => {
    if (proceeding) return;
    if (!buyingEnabled) {
      toast.error(
        sellingMessage?.trim() || 'Buying is temporarily disabled right now.'
      );
      return;
    }
    setProceeding(true);
    setTimeout(() => {
      router.push('/checkout');
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-[calc(100vh-200px)] mx-auto max-w-7xl px-4 py-8"
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Shopping Cart
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {totalItems > 0
            ? `${totalItems} item${totalItems === 1 ? '' : 's'} in your cart`
            : 'Review and manage the items in your cart before checkout.'}
        </p>
      </motion.div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={listSpring}
          className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <ShoppingBag size={56} className="text-gray-300" />
          </motion.div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Your cart is empty
          </h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Looks like you have not added anything to your cart yet. Browse our
            products and find something you like.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <Link href="/products" className="mt-6 inline-block">
              <Button size="sm" className="gap-2 flex items-center">
                <span>Continue Shopping</span>
                <ArrowRight size={18} />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: cart items */}
          <motion.div
            layout
            transition={listSpring}
            className="space-y-4 lg:col-span-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {items.length} product{items.length === 1 ? '' : 's'}
              </p>
              <button
                type="button"
                onClick={clearCart}
                className="flex items-center gap-1.5 text-sm font-medium text-red-600 transition hover:text-red-700"
              >
                <Trash2 size={15} />
                Clear cart
              </button>
            </div>

            <motion.div
              layout
              transition={listSpring}
              className="space-y-4"
              initial="hidden"
              animate="show"
            >
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <CartItemCard
                    key={`${item.productId}:${item.variantId || ''}`}
                    item={item}
                    priorityImage={index === 0}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Right: order summary */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, ...listSpring }}
            className="lg:col-span-1"
          >
            <motion.div
              layout
              transition={listSpring}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-4"
            >
              <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">
                    Subtotal ({totalItems} item{totalItems === 1 ? '' : 's'})
                  </dt>
                  <dd className="font-medium text-gray-900">
                    ৳{originalSubtotal.toLocaleString()}
                  </dd>
                </div>

                <AnimatePresence initial={false}>
                  {totalSavings > 0 && (
                    <motion.div
                      key="savings"
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <dt className="text-gray-500">Total savings</dt>
                        <dd className="font-semibold text-green-600">
                          -৳{totalSavings.toLocaleString()}
                        </dd>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Shipping</dt>
                  <dd className="font-medium text-gray-900">Free</dd>
                </div>

                <div className="my-2 border-t border-gray-200" />

                <div className="flex items-center justify-between text-base">
                  <dt className="font-semibold text-gray-900">Total</dt>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.dd
                      key={totalPrice}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={listSpring}
                      className="text-lg font-bold text-gray-900"
                    >
                      ৳{totalPrice.toLocaleString()}
                    </motion.dd>
                  </AnimatePresence>
                </div>
              </dl>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  loading={proceeding}
                  onClick={handleProceed}
                  disabled={!buyingEnabled}
                >
                  {buyingEnabled ? 'Proceed to Checkout' : 'Buying Disabled'}
                </Button>
              </motion.div>

              {!buyingEnabled && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  {sellingMessage?.trim() ||
                    'You can browse products, but checkout is disabled right now.'}
                </p>
              )}

              <motion.div whileHover={{ x: -3 }} transition={listSpring}>
                <Link
                  href="/products"
                  className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900"
                >
                  <ArrowLeft size={16} />
                  Continue Shopping
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContent />
    </RequireAuth>
  );
}
