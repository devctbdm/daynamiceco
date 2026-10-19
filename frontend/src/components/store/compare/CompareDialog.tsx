// src/components/store/compare/CompareDialog.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Scale, X } from 'lucide-react';
import { useCompare } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MAX_COMPARE } from '@/store/slices/compare.slice';

interface CompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const listSpring = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
};

export const CompareDialog = ({
  open,
  onOpenChange,
}: CompareDialogProps) => {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Compare Products ({compareItems.length}/{MAX_COMPARE})
          </DialogTitle>
          <DialogDescription>
            Add up to {MAX_COMPARE} products to view a side-by-side
            specification comparison.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {compareItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={listSpring}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <Scale size={44} className="text-muted-foreground/40" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="mt-4 text-sm font-medium text-foreground"
              >
                No products to compare yet
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.3 }}
                className="mt-1 text-sm text-muted-foreground"
              >
                Use the Compare button on any product card to add items here.
              </motion.p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {compareItems.map((item, index) => {
                const price =
                  item.discountPrice > 0 && item.discountPrice < item.price
                    ? item.discountPrice
                    : item.price;
                return (
                  <motion.div
                    key={item._id}
                    layout
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40, scale: 0.95 }}
                    transition={{ ...listSpring, delay: index * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                  >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={item.image || '/placeholder-image.png'}
                      alt={item.name}
                      fill
                      className="object-contain"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="line-clamp-1 text-sm font-medium text-foreground transition hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-sm font-semibold text-green-700">
                      ৳{price.toLocaleString()}
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.8, rotate: -12 }}
                    onClick={() => removeFromCompare(item._id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${item.name} from comparison`}
                  >
                    <X size={16} />
                  </motion.button>
                </motion.div>
              );
              })}
            </AnimatePresence>
          )}
        </div>

        <DialogFooter>
          {compareItems.length > 0 && (
            <>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearCompare}
                  className="text-muted-foreground"
                >
                  Clear all
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="sm:flex-1"
              >
                <Link
                  href="/product/compare"
                  onClick={() => onOpenChange(false)}
                  className="w-full"
                >
                  <Button className="w-full" size="lg">
                    View Comparison
                    <ArrowRight className="ml-2" size={16} />
                  </Button>
                </Link>
              </motion.div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompareDialog;
