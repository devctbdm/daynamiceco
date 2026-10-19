'use client';

import { motion } from 'motion/react';
import { RotateCcw, ShoppingBag, HelpCircle, MessageCircle } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { paymentApi, orderApi, type Order } from '@/lib/api';

const ringVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 120, damping: 14, delay: 0.1 } },
};

const crossVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { type: 'spring' as const, stiffness: 120, damping: 16, delay: 0.35, duration: 0.6 }, opacity: { duration: 0.1 } },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 14 } },
};

const orderIdFromTran = (tranId?: string) => (tranId ? tranId.split('_')[0] : '');

function CancellationContent() {
  const params = useSearchParams();
  const tran_id = params.get('tran_id') || undefined;
  const val_id = params.get('val_id') || undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = useMemo(() => orderIdFromTran(tran_id), [tran_id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (tran_id) {
          await paymentApi.cancel({ tran_id }).catch(async () => {
            await paymentApi.validate({ tran_id, val_id, status: 'CANCELLED' }).catch(() => {});
          });
        }
        if (orderId) {
          const res = await orderApi.getById(orderId);
          if (active && res.data.order) setOrder(res.data.order);
        }
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tran_id, val_id, orderId]);

  const amount = order?.payment?.amount ?? order?.totalAmount ?? 0;
  const method = order?.payment?.method ? order.payment.method.toUpperCase() : 'SSLCommerz';
  const date = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const displayId = order?.orderNumber || (orderId ? `#${orderId.slice(-8).toUpperCase()}` : '—');

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/5 blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>

      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full max-w-md">
        <Card className="border border-border/60 shadow-2xl shadow-rose-500/5">
          <CardContent className="flex flex-col items-center px-8 py-12 text-center">
            <div className="relative mb-8">
              <motion.div variants={ringVariants} className="flex items-center justify-center rounded-full bg-rose-500/10 p-5">
                <svg className="size-20 text-rose-500" viewBox="0 0 52 52" fill="none">
                  <motion.circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} />
                  <motion.path d="M18 18 L34 34 M34 18 L18 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={crossVariants} />
                </svg>
              </motion.div>
              <motion.div className="absolute -inset-3 rounded-full border border-rose-500/20" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: [0, 1, 0], scale: [0.7, 1.15, 1.25] }} transition={{ duration: 1.2, ease: 'easeOut' }} />
              <motion.div className="absolute -inset-6 rounded-full border border-rose-500/10" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: [0, 0.8, 0], scale: [0.7, 1.2, 1.35] }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.15 }} />
            </div>

            <motion.h1 variants={itemVariants} className="text-3xl font-semibold tracking-tight">
              Payment Cancelled
            </motion.h1>

            <motion.p variants={itemVariants} className="mt-3 max-w-xs text-sm text-muted-foreground">
              Your payment was not completed. No amount has been charged. You can retry the payment or continue browsing.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8 w-full space-y-3 rounded-xl bg-muted/40 p-4 text-left text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order number</span>
                <span className="font-medium">{displayId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{loading ? '—' : `৳${Number(amount).toLocaleString()}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment method</span>
                <span className="font-medium">{method}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{date}</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8 grid w-full gap-3 sm:grid-cols-2">
              <Button className="w-full bg-rose-600 hover:bg-rose-700">
                <Link href="/offers" className="flex items-center gap-2">
                  <RotateCcw className="size-4" />
                  Retry payment
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                <Link href="/offers" className="flex items-center gap-2">
                  <ShoppingBag className="size-4" />
                  Continue shopping
                </Link>
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-6 flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left">
              <HelpCircle className="shrink-0 size-5 text-amber-600" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Need help?</p>
                <p>Contact our support team if you were charged by mistake.</p>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        <motion.div variants={itemVariants} className="mt-6 flex justify-center gap-4 text-center text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-auto gap-1.5 p-0 text-xs">
            <Link href="/account" className="flex items-center gap-2">
              <MessageCircle className="size-3.5" />
              Contact support
            </Link>
          </Button>
          <span className="text-border">|</span>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
            <Link href="/account" className="flex items-center gap-2">
              View your account
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function PaymentCancellationPage() {
  return (
    <Suspense fallback={null}>
      <CancellationContent />
    </Suspense>
  );
}
