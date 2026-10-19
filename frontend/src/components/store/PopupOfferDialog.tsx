'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useResource } from '@/hooks/useResource';
import { popupOfferResource } from '@/lib/resources';
import { Button } from '@/components/ui/button';

export default function PopupOfferDialog() {
  const [image, setImage] = useState('');
  const [open, setOpen] = useState(false);
  const { data: popupOffer } = useResource(popupOfferResource);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    if (!popupOffer) return;

    const today = new Date();
    const dateKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    const countKey = `popup-offer-count-${dateKey}`;
    const shownCount = Number(localStorage.getItem(countKey) || '0');

    if (
      !popupOffer.enabled ||
      !popupOffer.image ||
      shownCount >= popupOffer.maxShowsPerDay
    ) {
      return;
    }

    timer = setTimeout(() => {
      if (cancelled) return;
      localStorage.setItem(countKey, String(shownCount + 1));
      setImage(popupOffer.image);
      setOpen(true);
    }, popupOffer.delaySeconds * 1000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [popupOffer]);

  function dismiss() {
    setOpen(false);
  }

  if (!open || !image) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-2 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Special offer"
      onClick={dismiss}
    >
      <div
        className="relative aspect-square h-82.5 w-82.5 max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl bg-background p-1 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/25 sm:rounded-2xl sm:p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={image}
          alt="Special offer"
          className="h-full w-full rounded-lg object-contain sm:rounded-xl"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2 rounded-full bg-black/65 text-white shadow-lg ring-1 ring-white/30 hover:bg-black/80 sm:right-4 sm:top-4"
          aria-label="Close offer"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
