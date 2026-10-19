'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RichTextView } from '@/components/RichTextView';
import { offerApi, type Offer } from '@/lib/api';
import { toast } from 'sonner';

function fmtShort(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-xl bg-primary/10 px-3 py-2">
      <motion.span
        key={value}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="text-2xl font-bold tabular-nums text-primary"
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function OfferDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    offerApi
      .getBySlug(slug)
      .then(({ data }) => {
        if (data.success) setOffer(data.offer);
      })
      .catch(() => toast.error('Offer not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading offer…
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">This offer is not available.</p>
        <Button variant="outline" render={<Link href="/offers" />}>
          <ArrowLeft className="h-4 w-4" /> Back to offers
        </Button>
      </div>
    );
  }

  const end = offer.endDate ? new Date(offer.endDate).getTime() : null;
  const diff = end ? end - now : 0;
  const ended = diff <= 0;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : '';
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  const FacebookIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/offers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" /> Offers
            </Button>
          </Link>

          {end && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                Offer Ends In
              </span>
              {ended ? (
                <span className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold">
                  Ended
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CountdownUnit value={days} label="Days" />
                  <CountdownUnit value={hours} label="Hrs" />
                  <CountdownUnit value={minutes} label="Min" />
                  <CountdownUnit value={seconds} label="Sec" />
                </div>
              )}
            </div>
          )}
        </div>

        <Card className="overflow-hidden">
          {offer.image && (
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={offer.image}
                alt={offer.title}
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <div className="space-y-5 p-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {offer.title}
              </h1>
              {(offer.startDate || offer.endDate) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={14} />
                  <span>
                    {fmtShort(offer.startDate)} to {fmtShort(offer.endDate)}
                  </span>
                </div>
              )}
            </div>

            {offer.shortDescription && (
              <p className="text-sm text-muted-foreground">{offer.shortDescription}</p>
            )}

            <RichTextView html={offer.fullDescription} />

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">Share this offer</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(shareUrl)
                      .then(() => toast.success('Link copied'))
                      .catch(() => toast.error('Could not copy link'));
                  }}
                >
                  <Share2 className="h-4 w-4" /> Copy link
                </Button>
                <Link href={fbUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" className="bg-[#1877F2] hover:bg-[#166fe0]">
                    <FacebookIcon size={16} /> Share on Facebook
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
