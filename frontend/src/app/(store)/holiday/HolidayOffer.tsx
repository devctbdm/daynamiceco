'use client';
import {
  ArrowRight,
  Copy,
  Check,
  Truck,
  ShieldCheck,
  RefreshCcw,
  Headphones,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { holidayApi, productApi, type HolidayConfig } from '@/lib/api';
import { formatBDT } from '@/utils/currency';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const DEFAULT_HOLIDAY: HolidayConfig = {
  heroBadge: 'Special Holiday Offer',
  title: 'Mega Offer',
  subtitle:
    'Celebrate the season with amazing deals on your favorite products!',
  discountPercent: 70,
  endDate: '2026-12-31T23:59:59',
  couponCode: 'HOLIDAY10',
  couponDescription:
    'Use the code below at checkout and stack your savings on top of holiday prices.',
  topDealsTitle: 'Top Holiday Deals',
  topDealsSubtitle: 'Hand-picked favorites at their lowest prices of the year.',
  active: true,
};

function getTimeLeft(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative overflow-hidden rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="block min-w-[2.5ch] text-center text-2xl font-bold tabular-nums text-white sm:text-3xl"
          >
            {value.toString().padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

function Countdown({ target }: { target?: string | null }) {
  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeLeft(target || DEFAULT_HOLIDAY.endDate || '')
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(target || DEFAULT_HOLIDAY.endDate || ''));
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      <CountdownUnit value={timeLeft.days} label="Days" />
      <span className="text-xl font-bold text-white/70 sm:text-2xl">:</span>
      <CountdownUnit value={timeLeft.hours} label="Hours" />
      <span className="text-xl font-bold text-white/70 sm:text-2xl">:</span>
      <CountdownUnit value={timeLeft.minutes} label="Min" />
      <span className="text-xl font-bold text-white/70 sm:text-2xl">:</span>
      <CountdownUnit value={timeLeft.seconds} label="Sec" />
    </div>
  );
}

const trustBadges = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'On all orders over ৳5,000',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payment',
    description: '100% safe checkout',
  },
  {
    icon: RefreshCcw,
    title: 'Easy Returns',
    description: '7-day return policy',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Always here to help',
  },
];

function CouponCode({
  code = DEFAULT_HOLIDAY.couponCode || 'HOLIDAY10',
  description = DEFAULT_HOLIDAY.couponDescription || '',
}: {
  code?: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-linear-to-r from-primary via-primary/80 to-secondary p-px shadow-2xl">
      <div className="relative rounded-[calc(1.5rem-1px)] bg-linear-to-br from-primary/10 via-background to-secondary/10 px-6 py-10 text-center sm:px-12 sm:py-14">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" />

        <p className="relative z-10 text-sm font-semibold uppercase tracking-widest text-primary sm:text-base">
          Extra Savings
        </p>
        <h3 className="relative z-10 mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Extra 10% Off Everything
        </h3>
        <p className="relative z-10 mt-2 text-sm text-muted-foreground sm:text-base">
          {description}
        </p>

        <div className="relative z-10 mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-4 shadow-sm">
            <span className="text-2xl font-bold tracking-widest text-foreground sm:text-3xl">
              {code}
            </span>
          </div>
          <Button
            onClick={handleCopy}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>

        <p className="relative z-10 mt-4 text-xs text-muted-foreground">
          Limited time offer. Cannot be combined with other promo codes.
        </p>
      </div>
    </div>
  );
}

export function HolidayOfferPage() {
  const [config, setConfig] = useState<HolidayConfig>(DEFAULT_HOLIDAY);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let active = true;
    holidayApi
      .getConfig()
      .then(({ data }) => {
        if (active && data?.config) setConfig({ ...DEFAULT_HOLIDAY, ...data.config });
      })
      .catch(() => {
        /* keep defaults */
      });
    productApi
      .getAll({ holiday: true, limit: 8 })
      .then(({ data }) => {
        if (active && Array.isArray(data?.products)) setProducts(data.products);
      })
      .catch(() => {
        /* keep grid empty */
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const {
    heroBadge,
    title,
    subtitle,
    discountPercent,
    endDate,
    couponCode,
    couponDescription,
    topDealsTitle,
    topDealsSubtitle,
  } = config;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary via-primary/90 to-secondary px-4 py-16 text-center sm:py-24">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <Badge className="mb-4 bg-white/20 text-white hover:bg-white/20">
              {heroBadge}
            </Badge>
            <h2 className="text-3xl font-bold text-white sm:text-5xl">
              {title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/90 sm:text-lg">
              {subtitle}
            </p>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
              Up to <span className="text-yellow-300">{discountPercent}</span>
              <span className="text-yellow-300">%</span> OFF
            </h1>

            <Link href="/products">
              <Button
                size="lg"
                className="mt-8 gap-2 bg-white text-primary hover:bg-white/90"
              >
                Shop Now
                <ArrowRight size={18} />
              </Button>
            </Link>
          </motion.div>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="mt-12"
          >
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/80">
              Offer Ends In:
            </p>
            <Countdown target={endDate} />
          </motion.div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustBadges.map((badge) => (
            <Card
              key={badge.title}
              className="border-border/50 bg-card text-center"
            >
              <CardContent className="flex flex-col items-center px-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <badge.icon size={24} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {badge.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {badge.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Top Holiday Deals */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {topDealsTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {topDealsSubtitle}
          </p>
        </div>

        {loadingProducts ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No holiday deals available yet. Mark products as holiday deals in the
            admin to show them here.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => {
              const regular = Number(product.price) || 0;
              const discounted = Number(product.discountPrice) || 0;
              const hasDiscount = discounted > 0 && discounted < regular;
              const current = hasDiscount ? discounted : regular;
              const badge = hasDiscount
                ? `${Math.round((1 - discounted / regular) * 100)}% Off`
                : 'Holiday Deal';
              return (
                <motion.div
                  key={product._id || product.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="group overflow-hidden border-border/50 bg-card">
                    <div className="relative aspect-4/3 overflow-hidden">
                      <img
                        src={
                          product.images?.[0] ||
                          'https://picsum.photos/seed/holiday/600/400'
                        }
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
                        {badge}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold text-foreground">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          {formatBDT(current, { decimalPlaces: 0 })}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatBDT(regular, { decimalPlaces: 0 })}
                          </span>
                        )}
                      </div>
                      <Link href={`/product/${product.slug}`}>
                        <Button className="mt-4 w-full gap-2">
                          Shop Now
                          <ArrowRight size={16} />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Coupon code */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <CouponCode code={couponCode} description={couponDescription} />
      </section>
    </div>
  );
}
