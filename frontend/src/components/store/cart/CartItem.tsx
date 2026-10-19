// src/components/store/cart/CartItem.tsx
'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '@/store/types';
import { useCart } from '@/store';

interface Props {
  item: CartItem;
}

const spring = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 26,
  mass: 0.8,
};

export const CartItemCard = ({ item }: Props) => {
  const { removeItem, updateQuantity } = useCart();
  const lineTotal = item.price * item.quantity;
  const savings = item.promoDiscount * item.quantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -48, scale: 0.92, transition: { duration: 0.22 } }}
      transition={spring}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex gap-4">
        <motion.div
          layout
          transition={spring}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100"
        >
          <Image
            src={item.image || '/placeholder-image.png'}
            alt={item.name}
            fill
            className="object-contain"
            sizes="96px"
          />
        </motion.div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-sm font-medium text-gray-900 md:text-base">
              {item.name}
            </p>
            <motion.button
              type="button"
              onClick={() => removeItem(item.productId)}
              aria-label={`Remove ${item.name} from cart`}
              whileTap={{ scale: 0.85 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </motion.button>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Unit price: ৳{item.price.toLocaleString()}
            {item.promoDiscount > 0 && (
              <span className="ml-1 font-medium text-green-600">
                (Save ৳{item.promoDiscount.toLocaleString()})
              </span>
            )}
          </p>

          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="flex items-center rounded-lg border border-gray-300">
              <motion.button
                type="button"
                whileTap={{ scale: 0.8 }}
                onClick={() =>
                  updateQuantity(item.productId, item.quantity - 1)
                }
                className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:text-gray-900"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </motion.button>
              <motion.span
                key={item.quantity}
                initial={{ scale: 1.35, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring}
                className="inline-block w-10 text-center text-sm font-semibold text-gray-900"
              >
                {item.quantity}
              </motion.span>
              <motion.button
                type="button"
                whileTap={{ scale: 0.8 }}
                onClick={() =>
                  updateQuantity(item.productId, item.quantity + 1)
                }
                disabled={item.quantity >= item.stock}
                className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </motion.button>
            </div>

            <div className="text-right">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={lineTotal}
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={spring}
                  className="text-base font-bold text-gray-900"
                >
                  ৳{lineTotal.toLocaleString()}
                </motion.p>
              </AnimatePresence>
              {savings > 0 && (
                <p className="text-xs font-medium text-green-600">
                  You save ৳{savings.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CartItemCard;
