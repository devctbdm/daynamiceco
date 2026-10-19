'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/http';
import type { RawProduct } from '@/lib/productMapper';

interface SearchBarProps {
  autoFocus?: boolean;
  onClose?: () => void;
  variant?: 'desktop' | 'mobile';
  commandKeyShortcut?: boolean;
}

const thumbFallback = (name: string) =>
  `https://placehold.co/600x400/1a1a2e/white?text=${encodeURIComponent(
    name || 'No Image'
  )}`;

function ResultThumb({ product }: { product: RawProduct }) {
  const [error, setError] = useState(false);
  const src =
    error || !product.images?.[0]
      ? thumbFallback(product.name)
      : product.images[0];
  return (
    <Image
      src={src}
      alt={product.name}
      width={44}
      height={44}
      className="h-11 w-11 shrink-0 rounded-md object-cover bg-slate-100"
      onError={() => setError(true)}
      unoptimized
    />
  );
}

export function SearchBar({
  autoFocus,
  onClose,
  variant = 'desktop',
  commandKeyShortcut = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [autoFocus]);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [close]);

  useEffect(() => {
    if (!commandKeyShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandKeyShortcut]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const myId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await apiFetch<{ success: boolean; products: any[] }>(
          '/products',
          { params: { search: q, limit: 8 } }
        );
        if (requestIdRef.current !== myId) return;
        setResults(data.success ? (data.products as RawProduct[]) : []);
        setActiveIndex(-1);
      } catch {
        if (requestIdRef.current !== myId) return;
        setResults([]);
      } finally {
        if (requestIdRef.current === myId) setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const goToProduct = (product: RawProduct) => {
    close();
    setQuery('');
    router.push(`/product/${product.slug}`);
  };

  const goToAllResults = () => {
    const q = query.trim();
    if (!q) return;
    close();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const finalPrice = (p: RawProduct) =>
    p.discountPrice > 0 ? p.discountPrice : p.price;
  const hasDiscount = (p: RawProduct) =>
    p.discountPrice > 0 && p.discountPrice < p.price;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0)
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        goToProduct(results[activeIndex]);
      } else {
        goToAllResults();
      }
    } else if (e.key === 'Escape') {
      if (query) {
        setQuery('');
        setOpen(false);
      } else {
        onClose?.();
      }
    }
  };

  const inputClass =
    variant === 'mobile'
      ? 'h-11 w-full rounded-xl border-white/10 bg-white/5 pl-10 pr-10 text-sm text-white placeholder:text-slate-400 focus:border-purple-500/50 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/20'
      : 'h-10 w-full rounded-xl border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 transition-all duration-300 focus:border-purple-500/50 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/20 hover:border-white/20';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-results"
          autoComplete="off"
          placeholder="Search for products, brands & more..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={inputClass}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          variant === 'desktop' && (
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 sm:flex">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          )
        )}
      </div>

      {open && query.trim() && (
        <div
          id="search-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No products found for &quot;{query.trim()}&quot;
            </div>
          ) : (
            <>
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((product, index) => (
                  <li key={product._id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToProduct(product)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        index === activeIndex
                          ? 'bg-purple-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <ResultThumb product={product} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {product.name}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-green-700">
                            ৳{finalPrice(product).toLocaleString()}
                          </span>
                          {hasDiscount(product) && (
                            <span className="text-xs text-slate-400 line-through">
                              ৳{product.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={goToAllResults}
                className="flex w-full items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-left text-sm font-medium text-purple-700 hover:bg-purple-50"
              >
                <Search className="h-4 w-4" />
                View all results for &quot;{query.trim()}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
