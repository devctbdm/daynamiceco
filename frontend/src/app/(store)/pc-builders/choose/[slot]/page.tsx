'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, Package, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { productApi } from '@/lib/api';
import { usePcBuilder, SlotKey, SLOT_LABELS } from '@/store/pc-builder';
import { partPrice as calcPrice } from '@/lib/utils';

// ── Filter option sets per component type ───────────────────────────────────

type FilterOption = { label: string; value: string };

type FilterDef = {
  key: string;
  label: string;
  type: 'select' | 'range' | 'minmax';
  options?: FilterOption[];
  min?: number;
  max?: number;
  specField?: string; // maps to pcPart.specs.<key>
};

const CPU_FILTERS: FilterDef[] = [
  {
    key: 'series',
    label: 'Series',
    type: 'select',
    specField: 'series',
    options: [
      { label: 'Core i3', value: 'Core i3' },
      { label: 'Core i5', value: 'Core i5' },
      { label: 'Core i7', value: 'Core i7' },
      { label: 'Core i9', value: 'Core i9' },
      { label: 'Ryzen 3', value: 'Ryzen 3' },
      { label: 'Ryzen 5', value: 'Ryzen 5' },
      { label: 'Ryzen 7', value: 'Ryzen 7' },
      { label: 'Ryzen 9', value: 'Ryzen 9' },
    ],
  },
  {
    key: 'generation',
    label: 'Generation',
    type: 'select',
    specField: 'generation',
    options: [
      { label: '12th Gen', value: '12th Gen' },
      { label: '13th Gen', value: '13th Gen' },
      { label: '14th Gen', value: '14th Gen' },
      { label: '15th Gen', value: '15th Gen' },
      { label: '5000 Series', value: '5000 Series' },
      { label: '7000 Series', value: '7000 Series' },
      { label: '9000 Series', value: '9000 Series' },
    ],
  },
  {
    key: 'socket',
    label: 'Socket',
    type: 'select',
    options: [
      { label: 'AM4', value: 'AM4' },
      { label: 'AM5', value: 'AM5' },
      { label: 'LGA1700', value: 'LGA1700' },
      { label: 'LGA1851', value: 'LGA1851' },
    ],
  },
  {
    key: 'cores',
    label: 'Cores',
    type: 'minmax',
    specField: 'cores',
    min: 2,
    max: 64,
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 500000 },
];

const GPU_FILTERS: FilterDef[] = [
  {
    key: 'brand',
    label: 'Brand',
    type: 'select',
    specField: 'brand',
    options: [
      { label: 'NVIDIA', value: 'NVIDIA' },
      { label: 'AMD', value: 'AMD' },
      { label: 'Intel', value: 'Intel' },
    ],
  },
  {
    key: 'vram',
    label: 'VRAM (GB)',
    type: 'select',
    specField: 'vram',
    options: [
      { label: '4 GB', value: '4' },
      { label: '6 GB', value: '6' },
      { label: '8 GB', value: '8' },
      { label: '10 GB', value: '10' },
      { label: '12 GB', value: '12' },
      { label: '16 GB', value: '16' },
      { label: '24 GB', value: '24' },
    ],
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 500000 },
];

const MOTHERBOARD_FILTERS: FilterDef[] = [
  {
    key: 'socket',
    label: 'Socket',
    type: 'select',
    options: [
      { label: 'AM4', value: 'AM4' },
      { label: 'AM5', value: 'AM5' },
      { label: 'LGA1700', value: 'LGA1700' },
      { label: 'LGA1851', value: 'LGA1851' },
    ],
  },
  {
    key: 'formFactor',
    label: 'Form Factor',
    type: 'select',
    options: [
      { label: 'ATX', value: 'ATX' },
      { label: 'microATX', value: 'microATX' },
      { label: 'Mini-ITX', value: 'Mini-ITX' },
    ],
  },
  {
    key: 'ramType',
    label: 'RAM Type',
    type: 'select',
    specField: 'ramType',
    options: [
      { label: 'DDR4', value: 'DDR4' },
      { label: 'DDR5', value: 'DDR5' },
    ],
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 100000 },
];

const RAM_FILTERS: FilterDef[] = [
  {
    key: 'ramType',
    label: 'Type',
    type: 'select',
    specField: 'ramType',
    options: [
      { label: 'DDR4', value: 'DDR4' },
      { label: 'DDR5', value: 'DDR5' },
    ],
  },
  {
    key: 'capacity',
    label: 'Capacity (GB)',
    type: 'select',
    specField: 'capacity',
    options: [
      { label: '8 GB', value: '8' },
      { label: '16 GB', value: '16' },
      { label: '32 GB', value: '32' },
      { label: '64 GB', value: '64' },
      { label: '128 GB', value: '128' },
    ],
  },
  {
    key: 'speed',
    label: 'Speed (MHz)',
    type: 'select',
    specField: 'speed',
    options: [
      { label: '3200 MHz', value: '3200' },
      { label: '3600 MHz', value: '3600' },
      { label: '4800 MHz', value: '4800' },
      { label: '5600 MHz', value: '5600' },
      { label: '6000 MHz', value: '6000' },
      { label: '6400 MHz', value: '6400' },
    ],
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 50000 },
];

const STORAGE_FILTERS: FilterDef[] = [
  {
    key: 'storageType',
    label: 'Type',
    type: 'select',
    specField: 'storageType',
    options: [
      { label: 'NVMe', value: 'NVMe' },
      { label: 'SSD', value: 'SSD' },
      { label: 'HDD', value: 'HDD' },
    ],
  },
  {
    key: 'capacity',
    label: 'Capacity',
    type: 'select',
    specField: 'capacity',
    options: [
      { label: '256 GB', value: '256' },
      { label: '512 GB', value: '512' },
      { label: '1 TB', value: '1000' },
      { label: '2 TB', value: '2000' },
      { label: '4 TB', value: '4000' },
    ],
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 50000 },
];

const COOLER_FILTERS: FilterDef[] = [
  {
    key: 'coolerType',
    label: 'Type',
    type: 'select',
    specField: 'coolerType',
    options: [
      { label: 'Air', value: 'air' },
      { label: 'Liquid', value: 'liquid' },
    ],
  },
  {
    key: 'socket',
    label: 'Socket',
    type: 'select',
    options: [
      { label: 'AM4', value: 'AM4' },
      { label: 'AM5', value: 'AM5' },
      { label: 'LGA1700', value: 'LGA1700' },
      { label: 'LGA1851', value: 'LGA1851' },
    ],
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 30000 },
];

const PSU_FILTERS: FilterDef[] = [
  {
    key: 'efficiency',
    label: 'Efficiency',
    type: 'select',
    specField: 'efficiency',
    options: [
      { label: '80+ Bronze', value: '80+ Bronze' },
      { label: '80+ Gold', value: '80+ Gold' },
      { label: '80+ Platinum', value: '80+ Platinum' },
    ],
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 30000 },
];

const MONITOR_FILTERS: FilterDef[] = [
  {
    key: 'panelType',
    label: 'Panel Type',
    type: 'select',
    specField: 'panelType',
    options: [
      { label: 'IPS', value: 'IPS' },
      { label: 'VA', value: 'VA' },
      { label: 'TN', value: 'TN' },
      { label: 'OLED', value: 'OLED' },
    ],
  },
  {
    key: 'refreshRate',
    label: 'Refresh Rate',
    type: 'select',
    specField: 'refreshRate',
    options: [
      { label: '60 Hz', value: '60' },
      { label: '75 Hz', value: '75' },
      { label: '144 Hz', value: '144' },
      { label: '165 Hz', value: '165' },
      { label: '240 Hz', value: '240' },
    ],
  },
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 200000 },
];

const FILTERS_BY_TYPE: Record<string, FilterDef[]> = {
  cpu: CPU_FILTERS,
  gpu: GPU_FILTERS,
  motherboard: MOTHERBOARD_FILTERS,
  ram: RAM_FILTERS,
  storage: STORAGE_FILTERS,
  cpu_cooler: COOLER_FILTERS,
  psu: PSU_FILTERS,
  monitor: MONITOR_FILTERS,
};

const DEFAULT_FILTERS: FilterDef[] = [
  { key: 'price', label: 'Price Range', type: 'minmax', min: 0, max: 100000 },
];

// ── Component ───────────────────────────────────────────────────────────────

type Product = {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  stock?: number;
  brand?: string;
  slug?: string;
  pcPart?: {
    enabled: boolean;
    type: string;
    socket?: string;
    platform?: string;
    formFactor?: string;
    wattage?: number;
    specs?: Record<string, any>;
  };
};

export default function ChoosePartPage() {
  const params = useParams();
  const router = useRouter();
  const slot = params.slot as SlotKey;
  const { selectPart, selected } = usePcBuilder();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const slotLabel = SLOT_LABELS[slot] || slot;
  const filters = FILTERS_BY_TYPE[slot] || DEFAULT_FILTERS;
  const currentSelection = selected[slot];

  useEffect(() => {
    fetchProducts();
  }, [slot, sort, search]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const queryParams: Record<string, string> = {
        type: slot,
        sort,
        limit: '200',
      };
      if (search) queryParams.search = search;

      // Map filter values to API query params (top-level params as backend reads them)
      for (const f of filters) {
        const val = filterValues[f.key];
        if (!val) continue;
        if (f.key === 'price') continue;
        if (f.key === 'socket') queryParams.socket = val;
        else if (f.key === 'formFactor') queryParams.formFactor = val;
        else if (f.specField) {
          // Numeric spec select filters -> backend uses min/max range params
          if (f.specField === 'vram') {
            queryParams.minVram = val;
            queryParams.maxVram = val;
          } else if (f.specField === 'capacity') {
            queryParams.minCapacity = val;
            queryParams.maxCapacity = val;
          } else if (f.specField === 'refreshRate') {
            queryParams.minRefreshRate = val;
            queryParams.maxRefreshRate = val;
          } else if (f.specField === 'cores') {
            // handled below via min/max
          } else {
            queryParams[f.specField] = val;
          }
        }
      }

      // Handle min/max price filters
      const priceFilter = filters.find((f) => f.key === 'price');
      if (priceFilter) {
        const minVal = filterValues['price_min'];
        const maxVal = filterValues['price_max'];
        if (minVal) queryParams.minPrice = minVal;
        if (maxVal) queryParams.maxPrice = maxVal;
      }

      // Handle cores min/max
      const coresFilter = filters.find((f) => f.specField === 'cores');
      if (coresFilter) {
        const minVal = filterValues['cores_min'];
        const maxVal = filterValues['cores_max'];
        if (minVal) queryParams.minCores = minVal;
        if (maxVal) queryParams.maxCores = maxVal;
      }

      const { data } = await productApi.getPcParts(queryParams);
      if (data.success) {
        setProducts(data.products);
      }
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(product: Product) {
    selectPart(slot, product);
    toast.success(`${product.name} added to ${slotLabel}`);
    router.push('/pc-builders');
  }

  const priceOf = (p: Product) =>
    p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/pc-builders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Choose {slotLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse and select a {slotLabel.toLowerCase()} for your build.
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* ── Filter sidebar ── */}
          <aside className="w-64 shrink-0">
            <Card>
              <CardContent className="p-4 space-y-5">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Filters
                  </Label>
                </div>

                {/* Search */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className="h-8 pl-7 text-sm"
                    />
                  </div>
                </div>

                {/* Dynamic filters */}
                {filters.map((f) => {
                  if (f.type === 'select') {
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs">{f.label}</Label>
                        <Select
                          value={filterValues[f.key] || 'all'}
                          onValueChange={(v) => {
                            const val = v ?? '';
                            setFilterValues((prev) => ({
                              ...prev,
                              [f.key]: val === 'all' ? '' : val,
                            }));
                            setTimeout(fetchProducts, 0);
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={`All ${f.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All {f.label}</SelectItem>
                            {f.options!.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  // min/max range filter
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          className="h-8 text-sm"
                          value={filterValues[`${f.key}_min`] || ''}
                          onChange={(e) =>
                            setFilterValues((prev) => ({
                              ...prev,
                              [`${f.key}_min`]: e.target.value,
                            }))
                          }
                          onBlur={() => fetchProducts()}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          className="h-8 text-sm"
                          value={filterValues[`${f.key}_max`] || ''}
                          onChange={(e) =>
                            setFilterValues((prev) => ({
                              ...prev,
                              [`${f.key}_max`]: e.target.value,
                            }))
                          }
                          onBlur={() => fetchProducts()}
                        />
                      </div>
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setFilterValues({});
                    setSearch('');
                    setTimeout(fetchProducts, 0);
                  }}
                >
                  Clear all
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* ── Product grid ── */}
          <div className="flex-1 min-w-0">
            {/* Sort bar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : `${products.length} products`}
              </p>
              <Select value={sort} onValueChange={(v) => setSort(v ?? 'name')}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-40 w-full rounded-md" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No products found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const isSelected = currentSelection?._id === product._id;
                  const specs = product.pcPart?.specs || {};
                  const specList = Object.entries(specs)
                    .filter(([, v]) => v !== '' && v !== 0 && v !== false)
                    .slice(0, 4);

                  return (
                    <Card
                      key={product._id}
                      className={`overflow-hidden transition-shadow hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="relative aspect-4/3 bg-gray-100">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-10 w-10 text-gray-300" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary">
                              <Check className="mr-1 h-3 w-3" /> Selected
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-medium line-clamp-2 text-sm">
                            {product.name}
                          </h3>
                          {product.brand && (
                            <p className="text-xs text-muted-foreground">
                              {product.brand}
                            </p>
                          )}
                        </div>

                        {specList.length > 0 && (
                          <div className="space-y-1">
                            {specList.map(([key, val]) => (
                              <div
                                key={key}
                                className="flex justify-between text-xs"
                              >
                                <span className="text-muted-foreground capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-medium">
                                  {typeof val === 'boolean'
                                    ? val
                                      ? 'Yes'
                                      : 'No'
                                    : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <p className="text-lg font-bold">
                              ৳{priceOf(product).toLocaleString()}
                            </p>
                            {product.discountPrice &&
                              product.discountPrice > 0 && (
                                <p className="text-xs text-muted-foreground line-through">
                                  ৳{product.price.toLocaleString()}
                                </p>
                              )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAdd(product)}
                            className="gap-1.5"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
