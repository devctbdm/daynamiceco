'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingCart,
  Save,
  Trash2,
  Plus,
  Package,
  Pencil,
  ChevronDown,
  Printer,
  Loader2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth, useCart } from '@/store';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';
import { pcBuilderApi } from '@/lib/api';
import { partPrice } from '@/lib/utils';
import {
  usePcBuilder,
  SlotKey,
  CORE_SLOTS,
  PERIPHERAL_SLOTS,
  SLOT_LABELS,
} from '@/store/pc-builder';

type SavedBuild = {
  _id: string;
  name: string;
  components: Record<string, { product: string; name: string; price: number }>;
};

export default function PcBuildersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { selected, removePart, clearAll } = usePcBuilder();
  const { addItem } = useCart();
  const { buyingEnabled, sellingMessage } = useStoreStatus();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [buildName, setBuildName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);

  useEffect(() => {
    if (isAuthenticated) loadBuilds();
  }, [isAuthenticated]);

  async function loadBuilds() {
    try {
      const { data } = await pcBuilderApi.getMyBuilds();
      if (data.success) setSavedBuilds(data.builds);
    } catch {
      /* silent */
    }
  }

  const selectedCount = Object.keys(selected).length;

  const totals = (() => {
    let price = 0;
    let wattage = 0;
    for (const slot of [...CORE_SLOTS, ...PERIPHERAL_SLOTS]) {
      const p = selected[slot];
      if (!p) continue;
      price += partPrice(p);
      wattage += Number(p.pcPart?.wattage) || 0;
    }
    return { price, wattage };
  })();

  const requiredMissing = (
    ['cpu', 'motherboard', 'ram', 'storage'] as SlotKey[]
  ).filter((s) => !selected[s]);

  async function addToCart() {
    if (!isAuthenticated && !localStorage.getItem('mobile_token')) {
      router.push(
        `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
      );
      return;
    }
    if (selectedCount === 0) {
      toast.error('Select at least one component');
      return;
    }
    if (!buyingEnabled) {
      toast.error(
        sellingMessage?.trim() || 'Buying is temporarily disabled right now.'
      );
      return;
    }
    for (const slot of [...CORE_SLOTS, ...PERIPHERAL_SLOTS]) {
      const p = selected[slot];
      if (!p) continue;
      await addItem({
        productId: p._id,
        name: p.name,
        price: partPrice(p),
        promoDiscount: 0,
        image: p.images?.[0] || '',
        stock: p.stock ?? 0,
        quantity: 1,
      });
    }
    toast.success(`${selectedCount} item(s) added to cart`);
  }

  async function saveBuild() {
    if (!isAuthenticated) {
      toast.error('Please log in to save builds');
      return;
    }
    if (selectedCount === 0) {
      toast.error('Add at least one component');
      return;
    }
    setSaving(true);
    try {
      const components: Record<string, { product: string }> = {};
      for (const slot of Object.keys(selected) as SlotKey[]) {
        components[slot] = { product: selected[slot]!._id };
      }
      const { data } = await pcBuilderApi.save({
        name: buildName.trim() || undefined,
        components,
      });
      if (data.success) {
        toast.success('Build saved');
        setSaveDialogOpen(false);
        setBuildName('');
        setSavedBuilds((prev) => [data.build, ...prev]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save build');
    } finally {
      setSaving(false);
    }
  }

  async function loadBuild(build: SavedBuild) {
    const { productApi } = await import('@/lib/api');
    const next: Partial<Record<SlotKey, any>> = {};
    for (const [slot, comp] of Object.entries(build.components)) {
      try {
        const { data } = await productApi.getById(comp.product);
        if (data.success) next[slot as SlotKey] = data.product;
      } catch {
        /* skip missing */
      }
    }
    // Clear and reload
    clearAll();
    for (const [slot, part] of Object.entries(next)) {
      if (part) usePcBuilder.getState().selectPart(slot as SlotKey, part);
    }
    toast.success(`Loaded "${build.name}"`);
  }

  async function deleteBuild(build: SavedBuild) {
    try {
      const { data } = await pcBuilderApi.remove(build._id);
      if (data.success) {
        setSavedBuilds((prev) => prev.filter((b) => b._id !== build._id));
        toast.success('Build deleted');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete build');
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50/60 print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* ── Builder header / actions ── */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">Build Your PC</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={addToCart}
                className="gap-2"
                disabled={selectedCount === 0 || !buyingEnabled}
              >
                <ShoppingCart className="h-4 w-4" />{' '}
                {buyingEnabled
                  ? `Add to cart (${selectedCount})`
                  : 'Buying Disabled'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error('Please log in to save builds');
                    return;
                  }
                  setSaveDialogOpen(true);
                }}
                className="gap-2"
                disabled={selectedCount === 0}
              >
                <Save className="h-4 w-4" /> Save PC
              </Button>
              {isAuthenticated && savedBuilds.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                    My Builds
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Saved builds</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {savedBuilds.map((b) => (
                        <div key={b._id}>
                          <DropdownMenuItem onClick={() => loadBuild(b)}>
                            <span className="flex-1 truncate">{b.name}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteBuild(b)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </div>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.print()}
                className="print:hidden"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Summary bar ── */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-6">
            {selectedCount > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>
                    Est. Wattage: <strong>{totals.wattage}W</strong>
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total:{' '}
                  <strong className="text-foreground">
                    ৳{totals.price.toLocaleString()}
                  </strong>
                </div>
              </>
            )}
            {requiredMissing.length > 0 && selectedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                Missing:{' '}
                {requiredMissing
                  .map((s) => SLOT_LABELS[s as SlotKey])
                  .join(', ')}
              </Badge>
            )}
          </div>

          {/* ── Core Components column ── */}
          <Section title="Core Components" slots={CORE_SLOTS} />

          {/* ── Peripherals column ── */}
          <Section title="Peripherals & Others" slots={PERIPHERAL_SLOTS} />
        </div>

        {/* ── Save dialog ── */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save your build</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Build name (optional)</Label>
              <Input
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                placeholder="e.g. Gaming RTX 4070 Build"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveBuild} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Print-only layout ─────────────────────────────────────────── */}
      <PrintLayout
        selected={selected}
        CORE_SLOTS={CORE_SLOTS}
        PERIPHERAL_SLOTS={PERIPHERAL_SLOTS}
      />
    </>
  );
}

// ── Print layout ─────────────────────────────────────────────────────────────

type PrintRow = {
  slot: SlotKey;
  label: string;
  name: string;
  price: number;
  regularPrice: number;
};

function PrintLayout({
  selected,
  CORE_SLOTS,
  PERIPHERAL_SLOTS,
}: {
  selected: Partial<Record<SlotKey, any>>;
  CORE_SLOTS: SlotKey[];
  PERIPHERAL_SLOTS: SlotKey[];
}) {
  const slots = [...CORE_SLOTS, ...PERIPHERAL_SLOTS];

  const rows: PrintRow[] = slots.map((slot) => {
    const part = selected[slot];
    return {
      slot,
      label: SLOT_LABELS[slot],
      name: part ? part.name : '',
      price: part ? partPrice(part) : 0,
      regularPrice: part ? Number(part.price) || 0 : 0,
    };
  });

  const totalPrice = rows.reduce((s, r) => s + r.price, 0);
  const totalRegular = rows.reduce((s, r) => s + r.regularPrice, 0);
  const totalSavings = Math.max(totalRegular - totalPrice, 0);

  return (
    <div className="hidden print:block p-6">
      {/* Header: left logo, right contact info */}
      <div className="flex items-center justify-between gap-6 border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0">
            <Image
              src="/Apple.svg"
              alt="Apple IT Zone"
              fill
              className="object-contain"
              sizes="40px"
            />
          </div>
          <span className="text-xl font-bold">Apple IT Zone</span>
        </div>
        <div className="text-right flex flex-col items-end gap-0.5">
          <span className="text-base font-semibold">Apple IT Zone</span>
          <span className="text-xs">Phone: 16793</span>
          <span className="text-xs">Email: testemail@gmail.com</span>
          <span className="text-xs">
            https://www.appleitzone.com/pc-builders
          </span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-2 text-left font-semibold border border-black">
              Component
            </th>
            <th className="py-2 px-2 text-left font-semibold border border-black">
              Product Name
            </th>
            <th className="py-2 px-2 text-right font-semibold border border-black">
              Price
            </th>
            <th className="py-2 px-2 text-right font-semibold border border-black">
              Regular Price
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.slot}>
              <td className="py-1.5 px-2 border border-gray-400">
                {row.label}
              </td>
              <td className="py-1.5 px-2 border border-gray-400">
                {row.name || ''}
              </td>
              <td className="py-1.5 px-2 text-right border border-gray-400">
                {row.name && row.price > 0
                  ? row.price.toLocaleString() + '৳'
                  : ''}
              </td>
              <td className="py-1.5 px-2 text-right border border-gray-400">
                {row.name && row.regularPrice > 0
                  ? row.regularPrice.toLocaleString() + '৳'
                  : ''}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="py-2 px-2 border border-black" colSpan={2}>
              Total
            </td>
            <td className="py-2 px-2 text-right border border-black">
              {totalPrice.toLocaleString()}৳
            </td>
            <td className="py-2 px-2 text-right border border-black">
              {totalRegular.toLocaleString()}৳
            </td>
          </tr>
          {totalSavings > 0 && (
            <tr className="font-medium">
              <td className="py-1 px-2 border border-gray-400" colSpan={2}>
                You Save
              </td>
              <td
                className="py-1 px-2 text-right border border-gray-400"
                colSpan={2}
              >
                {totalSavings.toLocaleString()}৳
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

// ── Section component ───────────────────────────────────────────────────────

function Section({ title, slots }: { title: string; slots: SlotKey[] }) {
  const router = useRouter();
  const { selected, removePart } = usePcBuilder();

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground text-center">
        {title}
      </h2>
      <Card className="mx-auto max-w-3xl">
        <CardContent className="divide-y p-0">
          {slots.map((slot) => {
            const part = selected[slot];
            const label = SLOT_LABELS[slot];
            const price = part ? partPrice(part) : 0;
            const wattage = part ? Number(part.pcPart?.wattage) || 0 : 0;
            const specs = part?.pcPart?.specs || {};
            const specLine = Object.entries(specs)
              .filter(([, v]) => v !== '' && v !== 0 && v !== false)
              .slice(0, 3)
              .map(([, v]) => String(v))
              .join(' · ');

            return (
              <div key={slot} className="flex items-center gap-4 px-4 py-3">
                {/* Slot label */}
                <div className="w-36 shrink-0">
                  <span className="text-sm font-medium">{label}</span>
                </div>

                {/* Part info or empty */}
                <div className="flex-1 min-w-0">
                  {part ? (
                    <div className="flex items-center gap-3">
                      {part.images?.[0] ? (
                        <img
                          src={part.images[0]}
                          alt={part.name}
                          className="h-10 w-10 shrink-0 rounded border object-contain bg-white"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-gray-50">
                          <Package className="h-4 w-4 text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {part.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            ৳{price.toLocaleString()}
                          </span>
                          {wattage > 0 && <span>{wattage}W</span>}
                          {specLine && (
                            <span className="truncate hidden sm:inline">
                              {specLine}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Not selected
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={part ? 'outline' : 'default'}
                    className="gap-1.5"
                    onClick={() => router.push(`/pc-builders/choose/${slot}`)}
                  >
                    {part ? (
                      <>
                        <Pencil className="h-3.5 w-3.5" /> Update
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Choose
                      </>
                    )}
                  </Button>
                  {part && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removePart(slot)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
