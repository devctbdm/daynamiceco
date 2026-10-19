"use client";
import { motion } from 'motion/react';
import { X, Copy, Check, RefreshCw, ShoppingCart, LifeBuoy } from 'lucide-react';
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

const shakeTransition = { duration: 0.5, delay: 0.65, ease: 'easeInOut' as const };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 14 } },
};

const orderIdFromTran = (tranId?: string) => (tranId ? tranId.split('_')[0] : '');

function FailContent() {
  const params = useSearchParams();
  const tran_id = params.get('tran_id') || undefined;
  const val_id = params.get('val_id') || undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const orderId = useMemo(() => orderIdFromTran(tran_id), [tran_id]);

  // Re-pay the SAME order instead of creating a duplicate. The order was
  // already created at checkout; a failed payment must not spawn a second one.
  const handleRetry = async () => {
    if (!orderId) {
      setRetryError('Could not find the original order. Please return to checkout.');
      return;
    }
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await orderApi.getById(orderId);
      const o = res.data.order;
      const isAdvance = !!tran_id?.includes('_adv_');
      const amount = o.payment?.amount ?? o.totalAmount;
      const u = typeof o.user === 'object' && o.user ? o.user : null;
      const customer = {
        name: u?.name || '',
        email: u?.email || '',
        phone: u?.phone || '',
        address: o.shippingAddress?.street || '',
        city: o.shippingAddress?.city || '',
        state: o.shippingAddress?.state || '',
        postcode: o.shippingAddress?.postcode || '',
      };
      const payRes = await paymentApi.initiate({ orderId, amount, customer, advance: isAdvance });
      if (payRes.data.success && payRes.data.gatewayUrl) {
        window.location.href = payRes.data.gatewayUrl;
        return;
      }
      throw new Error(payRes.data.message || 'Could not start the payment.');
    } catch (e: any) {
      setRetryError(
        e?.response?.data?.message ||
          e?.message ||
          'Payment could not be started. Please return to checkout.'
      );
      setRetrying(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (tran_id) {
          await paymentApi.validate({ tran_id, val_id, status: 'FAILED' }).catch(() => {});
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

  const attempted = order?.payment?.amount ?? order?.totalAmount ?? 0;
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
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/5 blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>

      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full max-w-md">
        <Card className="border border-border/60 shadow-2xl shadow-destructive/5">
          <CardContent className="flex flex-col items-center px-8 py-12 text-center">
            <div className="relative mb-8">
              <motion.div variants={ringVariants} className="flex items-center justify-center rounded-full bg-destructive/10 p-5">
                <motion.svg className="size-20 text-destructive" viewBox="0 0 52 52" fill="none" animate={{ x: [0, -6, 6, -4, 4, 0] }} transition={shakeTransition}>
                  <motion.circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} />
                  <motion.path d="M18 18 L34 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={crossVariants} />
                  <motion.path d="M34 18 L18 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={crossVariants} />
                </motion.svg>
              </motion.div>
              <motion.div className="absolute -inset-3 rounded-full border border-destructive/20" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: [0, 1, 0], scale: [0.7, 1.15, 1.25] }} transition={{ duration: 1.2, ease: 'easeOut' }} />
              <motion.div className="absolute -inset-6 rounded-full border border-destructive/10" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: [0, 0.8, 0], scale: [0.7, 1.2, 1.35] }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.15 }} />
            </div>

            <motion.h1 variants={itemVariants} className="text-3xl font-semibold tracking-tight">
              Payment Failed
            </motion.h1>

            <motion.p variants={itemVariants} className="mt-3 max-w-xs text-sm text-muted-foreground">
              We couldn&apos;t process your payment. No amount has been deducted — you can try again or use a different method.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-4 w-full space-y-3 rounded-xl bg-muted/40 p-4 text-left text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order number</span>
                <button onClick={copyOrderId} className="group inline-flex items-center gap-1.5 font-medium hover:underline" disabled={!order?.orderNumber}>
                  {displayId}
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount attempted</span>
                <span className="font-semibold">{loading ? '—' : `৳${Number(attempted).toLocaleString()}`}</span>
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
              <Button className="w-full" onClick={handleRetry} disabled={retrying}>
                <RefreshCw className={`size-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Redirecting…' : 'Try again'}
              </Button>
              <Button variant="outline" className="w-full">
                <Link href="/cart" className="flex items-center gap-2">
                  <ShoppingCart className="size-4" />
                  Back to cart
                </Link>
              </Button>
            </motion.div>

            {retryError ? (
              <motion.p variants={itemVariants} className="mt-3 text-center text-xs text-destructive">
                {retryError}
              </motion.p>
            ) : null}

            <motion.div variants={itemVariants} className="mt-3 w-full">
              <Link href="/support" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline">
                <LifeBuoy className="size-3.5" />
                Need help? Contact support
              </Link>
            </motion.div>
          </CardContent>
        </Card>

        <motion.p variants={itemVariants} className="mt-6 text-center text-xs text-muted-foreground">
          If money was deducted from your account, it will be auto-refunded within 5–7 business days.
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={null}>
      <FailContent />
    </Suspense>
  );
}
