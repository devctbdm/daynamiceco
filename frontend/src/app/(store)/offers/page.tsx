'use client';

import { useEffect, useState } from 'react';
import { Calendar, ArrowRight, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { motion } from 'motion/react';
import { offerApi, type Offer } from '@/lib/api';

function formatRange(startDate?: string, endDate?: string) {
  const fmt = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  const s = fmt(startDate);
  const e = fmt(endDate);
  if (s && e) return `${s} to ${e}`;
  if (e) return `Until ${e}`;
  if (s) return `From ${s}`;
  return '';
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    offerApi
      .getAll({ limit: 3, active: 'true' })
      .then(({ data }) => {
        if (data.success) setOffers(data.offers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <section className="text-center">
          <Badge variant="secondary" className="mb-4 gap-1 px-3 py-1 text-sm">
            <Tag size={14} />
            Limited Time Deals
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Special Offers
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Explore our latest promotions, discounts, and exclusive bundles.
            Grab them before they are gone.
          </p>
        </section>

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading offers…
          </div>
        ) : (
          <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer, i) => (
              <motion.div
                key={offer._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <Card className="group flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-16/10 overflow-hidden">
                    {offer.image ? (
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <Tag size={28} />
                      </div>
                    )}
                    
                  </div>

                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Calendar size={14} />
                      <span>{formatRange(offer.startDate, offer.endDate)}</span>
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-foreground">
                      {offer.title}
                    </h2>

                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
                      {offer.shortDescription}
                    </p>
                  </CardContent>

                  <CardFooter className="p-5 pt-0">
                    <Link href={`/offers/${offer.slug}`} className="h-full w-full mt-5">
                      <Button className="w-full gap-2">
                        View Offer <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </section>
        )}

        {!loading && offers.length === 0 && (
          <div className="mt-12 rounded-2xl border bg-muted/30 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No active offers right now. Check back soon for new deals.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
