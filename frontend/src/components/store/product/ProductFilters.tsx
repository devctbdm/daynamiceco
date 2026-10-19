// src/components/store/product/ProductFilters.tsx
'use client';

import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ChevronDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';
import {
  buildFacetGroups,
  getPriceRange,
  hasActiveFilters,
  type FacetGroup,
  type FilterState,
} from '@/lib/specFilters';

interface ProductFiltersProps {
  products: Product[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function Section({
  title,
  open,
  onOpenChange,
  children,
  badge,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="border-b border-gray-100 py-4"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <span className="flex items-center gap-1.5">
          {badge ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
              {badge}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-gray-400 transition-transform',
              open && 'rotate-180'
            )}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CheckRow({
  label,
  checked,
  onCheckedChange,
  count,
  meta,
}: {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  count?: number;
  meta?: React.ReactNode;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
      <span className="flex-1 text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
      {meta}
      {count != null && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </label>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= Math.round(value) ? 'fill-current' : 'opacity-30'}
        />
      ))}
    </span>
  );
}

export function ProductFilters({
  products,
  filters,
  onChange,
}: ProductFiltersProps) {
  const facets = useMemo(() => buildFacetGroups(products), [products]);
  const priceRange = useMemo(() => getPriceRange(products), [products]);
  const [openState, setOpenState] = useState<Record<string, boolean>>({});

  const min = priceRange[0];
  const max = Math.max(priceRange[1], min + 1);

  const priceValue: [number, number] = filters.price ?? [min, max];

  // Brand facet (from product.brand, first-class in the sidebar)
  const brandValues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.brand) continue;
      const b = p.brand.trim();
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [products]);

  const ratingOptions = [4, 3, 2];

  const selectedBrands = filters.specs['Brand'] ?? [];
  const rating = filters.rating;

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.price) {
      if (priceValue[0] !== min || priceValue[1] !== max) n += 1;
    }
    n += filters.availability.length;
    if (filters.rating != null) n += 1;
    for (const v of Object.values(filters.specs)) n += v.length;
    return n;
  }, [filters, priceValue, min, max]);

  const setOpen = (key: string, open: boolean) =>
    setOpenState((s) => ({ ...s, [key]: open }));

  const isOpen = (key: string, def: boolean) =>
    openState[key] ?? def;

  const toggleSpec = (key: string, value: string) => {
    const current = filters.specs[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const specs = { ...filters.specs };
    if (next.length > 0) {
      specs[key] = next;
    } else {
      delete specs[key];
    }
    onChange({ ...filters, specs });
  };

  const toggleAvailability = (value: 'in' | 'out') => {
    const current = filters.availability;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, availability: next });
  };

  const setRating = (value: number | null) => {
    onChange({ ...filters, rating: value });
  };

  const availableFacets = facets.filter(
    (g) => g.key !== 'Brand' || brandValues.length === 0
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Filter</h2>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              price: null,
              availability: [],
              rating: null,
              specs: {},
            })
          }
          disabled={!hasActiveFilters(filters, [min, max])}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:pointer-events-none disabled:opacity-40"
        >
          Clear all
        </button>
      </div>

      {/* Price */}
      <div className="px-4">
        <Section
          title="Price"
          open={isOpen('price', true)}
          onOpenChange={(o) => setOpen('price', o)}
          badge={filters.price ? 1 : undefined}
        >
          <Slider
            value={priceValue}
            min={min}
            max={max}
            step={1}
            onValueChange={(next) => {
              const arr = Array.isArray(next) ? next : [min, max];
              onChange({
                ...filters,
                price: [Math.min(arr[0], arr[1]), Math.max(arr[0], arr[1])],
              });
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                $
              </span>
              <Input
                value={priceValue[0]}
                type="number"
                min={min}
                max={max}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const next: [number, number] = [
                    Number.isFinite(v) ? v : min,
                    priceValue[1],
                  ];
                  onChange({
                    ...filters,
                    price: [Math.min(next[0], next[1]), Math.max(next[0], next[1])],
                  });
                }}
                className="pl-7 text-sm"
                aria-label="Minimum price"
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                $
              </span>
              <Input
                value={priceValue[1]}
                type="number"
                min={min}
                max={max}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const next: [number, number] = [
                    priceValue[0],
                    Number.isFinite(v) ? v : max,
                  ];
                  onChange({
                    ...filters,
                    price: [Math.min(next[0], next[1]), Math.max(next[0], next[1])],
                  });
                }}
                className="pl-7 text-sm"
                aria-label="Maximum price"
              />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            ${priceValue[0].toLocaleString()} – ${priceValue[1].toLocaleString()}
          </p>
        </Section>
      </div>

      {/* Quality / Rating */}
      <div className="px-4">
        <Section
          title="Quality"
          open={isOpen('rating', true)}
          onOpenChange={(o) => setOpen('rating', o)}
          badge={rating != null ? 1 : undefined}
        >
          {ratingOptions.map((r) => (
            <label
              key={r}
              className="group flex cursor-pointer items-center gap-2.5 text-sm text-gray-700"
            >
              <Checkbox
                checked={rating === r}
                onCheckedChange={() => setRating(rating === r ? null : r)}
                className="shrink-0"
              />
              <StarRating value={r} />
              <span className="text-gray-700 group-hover:text-gray-900">& up</span>
            </label>
          ))}
          {ratingOptions.length === 0 && (
            <p className="text-xs text-gray-400">No ratings available.</p>
          )}
        </Section>
      </div>

      {/* Availability */}
      <div className="px-4">
        <Section
          title="Availability"
          open={isOpen('avail', true)}
          onOpenChange={(o) => setOpen('avail', o)}
          badge={filters.availability.length || undefined}
        >
          <CheckRow
            label="In Stock"
            checked={filters.availability.includes('in')}
            onCheckedChange={() => toggleAvailability('in')}
          />
          <CheckRow
            label="Out of Stock"
            checked={filters.availability.includes('out')}
            onCheckedChange={() => toggleAvailability('out')}
          />
        </Section>
      </div>

      {/* Brand */}
      {brandValues.length > 0 && (
        <div className="px-4">
          <Section
            title="Brand"
            open={isOpen('brand', true)}
            onOpenChange={(o) => setOpen('brand', o)}
            badge={selectedBrands.length || undefined}
          >
            {brandValues.map(({ value, count }) => (
              <CheckRow
                key={value}
                label={value}
                count={count}
                checked={selectedBrands.includes(value)}
                onCheckedChange={() => toggleSpec('Brand', value)}
              />
            ))}
          </Section>
        </div>
      )}

      {/* Spec facets */}
      <div className="px-4">
        {availableFacets.map((group) => (
          <Section
            key={group.key}
            title={group.label}
            open={isOpen(group.key, true)}
            onOpenChange={(o) => setOpen(group.key, o)}
            badge={
              (filters.specs[group.key] ?? []).length || undefined
            }
          >
            {group.values.map((option) => (
              <CheckRow
                key={option.value}
                label={option.value}
                count={option.count}
                checked={(filters.specs[group.key] ?? []).includes(option.value)}
                onCheckedChange={() => toggleSpec(group.key, option.value)}
              />
            ))}
          </Section>
        ))}

        {availableFacets.length === 0 && brandValues.length === 0 && (
          <p className="py-4 text-sm text-gray-400">
            No filters available for this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
