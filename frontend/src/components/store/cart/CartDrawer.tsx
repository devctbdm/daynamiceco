// src/components/store/cart/CartDrawer.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart, useUI } from '@/store';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const listSpring = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
};

export const CartDrawer = () => {
  const { items, totalItems, totalPrice, removeItem, updateQuantity } =
    useCart();
  const { isCartDrawerOpen, toggleCartDrawer } = useUI();
  const { buyingEnabled, sellingMessage } = useStoreStatus();

  return (
    <Sheet open={isCartDrawerOpen} onOpenChange={() => toggleCartDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            Your Cart ({totalItems} item{totalItems === 1 ? '' : 's'})
          </SheetTitle>
          <SheetDescription>
            Review and manage the items in your shopping cart.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-none px-4">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={listSpring}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <ShoppingBag size={44} className="text-muted-foreground/40" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="mt-4 font-medium text-foreground"
              >
                Your cart is empty
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.3 }}
                className="mt-1 text-sm text-muted-foreground"
              >
                Add some products to get started.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.3 }}
              >
                <Link href="/" onClick={toggleCartDrawer} className="mt-5">
                  <Button>Browse Products</Button>
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <div className="space-y-3 pb-2">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.div
                    key={`${item.productId}:${item.variantId || ''}`}
                    layout
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40, scale: 0.95 }}
                    transition={{ ...listSpring, delay: index * 0.05 }}
                    className="flex gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={item.image || '/placeholder-image.png'}
                        alt={item.name}
                        fill
                        className="object-contain"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-green-700">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={item.price * item.quantity}
                            initial={{ opacity: 0, y: 8, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.9 }}
                            transition={listSpring}
                            className="inline-block"
                          >
                            ৳{(item.price * item.quantity).toLocaleString()}
                          </motion.span>
                        </AnimatePresence>
                        {item.quantity > 1 && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (৳{item.price.toLocaleString()} × {item.quantity})
                          </span>
                        )}
                      </p>
                      {item.promoDiscount > 0 && (
                        <p className="mt-0.5 text-xs font-medium text-green-700">
                          You save ৳
                          {(
                            item.promoDiscount * item.quantity
                          ).toLocaleString()}
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground">
                              {' '}
                              (৳{item.promoDiscount.toLocaleString()}/unit)
                            </span>
                          )}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-border">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.8 }}
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity - 1,
                                item.variantId
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-foreground"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </motion.button>
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={item.quantity}
                              initial={{ opacity: 0, y: 6, scale: 0.7 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.7 }}
                              transition={listSpring}
                              className="w-8 text-center text-sm font-medium text-foreground"
                            >
                              {item.quantity}
                            </motion.span>
                          </AnimatePresence>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity + 1,
                                item.variantId
                              )
                            }
                            disabled={item.quantity >= item.stock}
                            className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.8, rotate: -12 }}
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <AnimatePresence>
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={listSpring}
            >
              <SheetFooter className="border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={totalPrice}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={listSpring}
                      className="text-lg font-bold text-foreground"
                    >
                      ৳{totalPrice.toLocaleString()}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full"
                >
                  <Link
                    href="/checkout/cart"
                    onClick={toggleCartDrawer}
                    className="w-full"
                  >
                    <Button className="w-full" size="lg">
                      View Cart
                    </Button>
                  </Link>
                </motion.div>
                <p className="text-center text-xs text-muted-foreground">
                  Shipping and promo codes are applied at checkout.
                </p>
                {!buyingEnabled && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    {sellingMessage?.trim() ||
                      'Buying is temporarily disabled. You can browse products, but checkout is unavailable.'}
                  </p>
                )}
              </SheetFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
