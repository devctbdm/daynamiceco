"use client";
import { motion } from 'motion/react';
import { Check, Copy, ShoppingBag, FileText } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { paymentApi, orderApi, type Order } from '@/lib/api';
import { useCart } from '@/store';

const ringVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 14, delay: 0.1 },
  },
};

const checkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: 'spring' as const, stiffness: 120, damping: 16, delay: 0.35, duration: 0.6 },
      opacity: { duration: 0.1 },
    },
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

function Confetti() {
  const pieces = Array.from({ length: 28 });
  const colors = ['bg-primary', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 1.5 + Math.random() * 1.5;
        const size = 6 + Math.random() * 8;
        const rotation = -180 + Math.random() * 360;
        const drift = -60 + Math.random() * 120;
        return (
          <motion.div
            key={i}
            className={`absolute top-0 ${colors[i % colors.length]}`}
            style={{ left: `${left}%`, width: size, height: size * 1.6 }}
            initial={{ y: -30, opacity: 0, rotate: 0, x: 0 }}
            animate={{ y: [0, window.innerHeight + 80], opacity: [0, 1, 1, 0], rotate: [0, rotation, rotation * 1.5], x: [0, drift, drift * 0.5] }}
            transition={{ duration, delay, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

const orderIdFromTran = (tranId?: string) => (tranId ? tranId.split('_')[0] : '');

function SuccessContent() {
  const params = useSearchParams();
  const tran_id = params.get('tran_id') || undefined;
  const val_id = params.get('val_id') || undefined;
  const status = params.get('status') || undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { clearCart } = useCart();

  const orderId = useMemo(() => orderIdFromTran(tran_id), [tran_id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (tran_id) {
          await paymentApi.validate({ tran_id, val_id, status: status || 'VALID' }).catch(() => {});
          // Payment succeeded (SSLCommerz only lands here on success) — now
          // it's safe to empty the cart. We deliberately do NOT clear it on a
          // failed payment so the customer can retry with items intact.
          clearCart();
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('aiz_pending_order');
          }
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
  }, [tran_id, val_id, status, orderId, clearCart]);

  const paid = order?.payment?.amount ?? order?.totalAmount ?? 0;
  const method = order?.payment?.method ? order.payment.method.toUpperCase() : 'SSLCommerz';
  const date = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const displayId = order?.orderNumber || (orderId ? `#${orderId.slice(-8).toUpperCase()}` : '—');

  const copyOrderId = () => {
    if (!order?.orderNumber) return;
    void navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Confetti />

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="bg-primary/5 absolute top-1/2 left-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>

      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full max-w-md">
        <Card className="border border-border/60 shadow-2xl shadow-primary/5">
          <CardContent className="flex flex-col items-center px-8 py-12 text-center">
            <div className="relative mb-8">
              <motion.div variants={ringVariants} className="bg-primary/10 flex items-center justify-center rounded-full p-5">
                <svg className="text-primary size-20" viewBox="0 0 52 52" fill="none">
                  <motion.circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} />
                  <motion.path d="M16 26 L23 33 L36 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={checkVariants} />
                </svg>
              </motion.div>
              <motion.div className="absolute -inset-3 rounded-full border border-primary/20" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: [0, 1, 0], scale: [0.7, 1.15, 1.25] }} transition={{ duration: 1.2, ease: 'easeOut' }} />
              <motion.div className="absolute -inset-6 rounded-full border border-primary/10" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: [0, 0.8, 0], scale: [0.7, 1.2, 1.35] }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.15 }} />
            </div>

            <motion.h1 variants={itemVariants} className="text-3xl font-semibold tracking-tight">
              Payment Successful!
            </motion.h1>

            <motion.p variants={itemVariants} className="text-muted-foreground mt-3 max-w-xs text-sm">
              Thank you for your purchase. Your order has been confirmed and is being prepared for delivery.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8 w-full space-y-3 rounded-xl bg-muted/40 p-4 text-left text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order number</span>
                <button onClick={copyOrderId} className="group inline-flex items-center gap-1.5 font-medium hover:underline" disabled={!order?.orderNumber}>
                  {displayId}
                  {copied ? <Check className="text-emerald-600 size-3.5" /> : <Copy className="text-muted-foreground group-hover:text-foreground size-3.5 transition-colors" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount paid</span>
                <span className="font-semibold">{loading ? '—' : `৳${Number(paid).toLocaleString()}`}</span>
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
              <Button className="w-full">
                <Link href="/offers" className="flex items-center gap-2">
                  <ShoppingBag className="size-4" />
                  Continue shopping
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                <Link href="/accounts" className="flex items-center gap-2">
                  <FileText className="size-4" />
                  View order
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        <motion.p variants={itemVariants} className="text-muted-foreground mt-6 text-center text-xs">
          A confirmation email has been sent to your registered address.
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
