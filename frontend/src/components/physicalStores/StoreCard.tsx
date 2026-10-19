import { Home, Phone, Clock, CalendarOff, Navigation } from 'lucide-react';
import type { PhysicalStore } from '@/lib/api';

const telHref = (number: string) => `tel:${number.replace(/[^\d+]/g, '')}`;

/**
 * Presentational store branch card (server component — no client JS).
 */
export function StoreCard({ store }: { store: PhysicalStore }) {
  const hours =
    store.openTime || store.closeTime
      ? `${store.openTime || '—'} – ${store.closeTime || '—'}`
      : '';

  const phones = (store.phones || []).filter((p) => p.label || p.number);
  const hasFooter = Boolean(hours || store.offDay || store.mapUrl);

  return (
    <article className="flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-lg font-semibold leading-tight">{store.title}</h3>

      {store.address && (
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
          <Home className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{store.address}</span>
        </p>
      )}

      {store.description && (
        <p className="mt-2 text-sm text-muted-foreground">
          {store.description}
        </p>
      )}

      {phones.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {phones.map((p, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {p.label && (
                <span className="text-muted-foreground">{p.label}:</span>
              )}
              {p.number &&
                (p.number ? (
                  <a
                    href={telHref(p.number)}
                    className="font-medium hover:underline"
                  >
                    {p.number}
                  </a>
                ) : null)}
            </li>
          ))}
        </ul>
      )}

      {hasFooter && (
        <div className="mt-auto pt-4">
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              {hours && (
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{hours}</span>
                </p>
              )}
              {store.offDay && (
                <p className="flex items-center gap-2">
                  <CalendarOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Off: {store.offDay}</span>
                </p>
              )}
            </div>

            {store.mapUrl && (
              <a
                href={store.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get Directions
                <Navigation className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default StoreCard;
