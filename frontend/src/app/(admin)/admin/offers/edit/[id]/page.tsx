'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OfferForm } from '@/components/admin/offers/OfferForm';
import { offerApi, type Offer } from '@/lib/api';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    offerApi
      .getById(id)
      .then(({ data }) => {
        if (data.success) setOffer(data.offer);
        else toast.error('Offer not found');
      })
      .catch(() => toast.error('Failed to load offer'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading offer…
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Offer not found.</p>
        <Button variant="outline" onClick={() => router.push('/admin/offers')}>
          Back to offers
        </Button>
      </div>
    );
  }

  return (
    <>
    <SiteHeader />
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Offer</h1>
          <p className="text-sm text-muted-foreground">{offer.title}</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <OfferForm mode="edit" initial={offer} />
        </CardContent>
      </Card>
    </div>
    </>
  );
}
