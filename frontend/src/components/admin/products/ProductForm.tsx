'use client';

import {
  Plus,
  Star,
  Gift,
  Trash2,
  X,
  Astroid,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { productApi } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUploader } from '@/components/admin/products/ImageUploader';
import { CategoryMultiSelect } from '@/components/admin/products/CategoryMultiSelect';
import {
  PcPartEditor,
  PcPartFormValue,
  EMPTY_PC_PART,
} from '@/components/admin/products/PcPartEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ──────────────────────────────────────────────────────────────────

export type Status = 'active' | 'draft' | 'out_of_stock';

export type SpecField = { id: string; label: string; value: string };
export type SpecGroup = { id: string; name: string; fields: SpecField[] };
export type KeySpec = { id: string; label: string; value: string };
export type KeyFeature = { id: string; label: string; value: string };

export type ContentBlock =
  | { id: string; type: 'title'; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'image'; url: string; alt: string }
  | { id: string; type: 'link'; label: string; url: string };

export type ProductFormValue = {
  name: string;
  sku: string;
  productCode: string;
  brand: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  imageAlts: string;
  categories: string[];
  price: number;
  regularPrice: number;
  costPrice: number;
  stock: number;
  status: Status;
  featured: boolean;
  holiday: boolean;
  description: string;
  images: string[];
  keySpecs: KeySpec[];
  keyFeatures: KeyFeature[];
  specs: SpecGroup[];
  content: string;
  pcPart: PcPartFormValue;
};

export const EMPTY_FORM_VALUE: ProductFormValue = {
  name: '',
  sku: '',
  productCode: '',
  brand: '',
  slug: '',
  metaTitle: '',
  metaDescription: '',
  focusKeyword: '',
  imageAlts: '',
  categories: [],
  price: 0,
  regularPrice: 0,
  costPrice: 0,
  stock: 0,
  status: 'active',
  featured: false,
  holiday: false,
  description: '',
  images: [],
  keySpecs: [],
  keyFeatures: [],
  specs: [],
  content: '',
  pcPart: { ...EMPTY_PC_PART },
};

// Convert legacy block-array content (old ContentEditor) into rich-text HTML so
// it can be opened in the TipTap editor. HTML strings pass through untouched.
export function contentToHtml(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const escape = (s: unknown) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  return content
    .map((block: any) => {
      if (!block || typeof block !== 'object') return '';
      switch (block.type) {
        case 'title':
          return `<h3>${escape(block.text)}</h3>`;
        case 'text':
          return `<p>${escape(block.text)}</p>`;
        case 'image':
          return block.url
            ? `<img src="${escape(block.url)}" alt="${escape(block.alt || '')}" />`
            : '';
        case 'link':
          return block.url
            ? `<p><a href="${escape(block.url)}" target="_blank" rel="noreferrer">${escape(block.label || block.url)}</a></p>`
            : '';
        default:
          return '';
      }
    })
    .join('');
}

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

// Uppercase alphanumeric segments derived from free text.
// Mirrors buildSkuBase() in backend/src/utils/sku.js so the client can rebuild
// the SKU base live when the title changes.
const toSkuSegments = (text: string, maxSegments: number) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, maxSegments)
    .map((s) => s.slice(0, 8).toUpperCase());

// Deterministic base for a SKU built from the product title + category.
export function buildSkuBase(name: string, category?: string) {
  const nameSegs = toSkuSegments(name, 2);
  const catSegs = toSkuSegments(category || '', 1).map((s) => s.slice(0, 4));
  return [...nameSegs, ...catSegs].filter(Boolean).join('-');
}

export function parseSpecifications(raw: any): {
  keySpecs: KeySpec[];
  keyFeatures: KeyFeature[];
  specGroups: SpecGroup[];
} {
  const data: Record<string, any> =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return {};
          }
        })()
      : raw || {};

  if (data._keySpecs || data._keyFeatures || data._specGroups) {
    return {
      keySpecs: Object.entries(data._keySpecs || {}).map(([k, v]) => ({
        id: uid(),
        label: k,
        value: String(v),
      })),
      keyFeatures: Object.entries(data._keyFeatures || {}).map(([k, v]) => ({
        id: uid(),
        label: k,
        value: String(v),
      })),
      specGroups: Object.entries(data._specGroups || {}).map(
        ([name, fields]: [string, any]) => ({
          id: uid(),
          name,
          fields: Object.entries(fields || {}).map(([k, v]) => ({
            id: uid(),
            label: k,
            value: String(v),
          })),
        })
      ),
    };
  }

  const legacyKeyFeatures: KeyFeature[] = [];
  const legacySpecGroups: SpecGroup[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'object' && val !== null) {
      const fields = Object.entries(val).map(([k, v]) => ({
        id: uid(),
        label: k,
        value: String(v),
      }));
      legacySpecGroups.push({ id: uid(), name: key, fields });
    } else {
      legacyKeyFeatures.push({ id: uid(), label: key, value: String(val) });
    }
  }
  return {
    keySpecs: [],
    keyFeatures: legacyKeyFeatures,
    specGroups: legacySpecGroups,
  };
}

// ── ProductForm ────────────────────────────────────────────────────────────

export function ProductForm({
  value,
  onChange,
  categories,
  imageFiles,
  onImageFilesChange,
  enableAutoGenerate = false,
}: {
  value: ProductFormValue;
  onChange: (v: Partial<ProductFormValue>) => void;
  categories: { _id: string; name: string; parentId: string | null }[];
  imageFiles: File[];
  onImageFilesChange: (files: File[]) => void;
  enableAutoGenerate?: boolean;
}) {
  const [generatingSku, setGeneratingSku] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  // Currency symbol from store settings (falls back to the config default).
  const { symbol: currencySymbol } = useCurrency();
  // Unique SKU suffix issued by the server (kept stable while the title changes).
  const [skuSuffix, setSkuSuffix] = useState<string | null>(null);
  // Once the admin edits the SKU by hand we stop auto-updating it.
  const [skuTouched, setSkuTouched] = useState(false);

  const primaryCategoryName =
    categories.find((c) => c._id === value.categories[0])?.name || '';

  const handleGenerateSku = async () => {
    if (!value.name.trim()) {
      toast.error('Enter the product name first');
      return;
    }
    setGeneratingSku(true);
    try {
      const { data } = await productApi.generateSku({
        name: value.name,
        category: primaryCategoryName,
      });
      if (data.success) {
        onChange({ sku: data.sku });
        setSkuSuffix(data.suffix);
        setSkuTouched(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate SKU');
    } finally {
      setGeneratingSku(false);
    }
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const { data } = await productApi.generateProductCode();
      if (data.success) {
        onChange({ productCode: data.productCode });
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to generate product code'
      );
    } finally {
      setGeneratingCode(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Name</Label>
          <Input
            value={value.name}
            onChange={(e) => {
              const name = e.target.value;
              const patch: Partial<ProductFormValue> = { name };
              // Keep the auto-generated SKU in sync with the title, but only
              // while the admin hasn't edited the SKU by hand.
              if (enableAutoGenerate && !skuTouched && skuSuffix) {
                const base = buildSkuBase(name, primaryCategoryName);
                patch.sku = base ? `${base}-${skuSuffix}` : skuSuffix;
              }
              onChange(patch);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>SKU</Label>
          <div className="flex items-center gap-2">
            <Input
              value={value.sku}
              className="flex-1"
              onChange={(e) => {
                if (enableAutoGenerate) setSkuTouched(true);
                onChange({ sku: e.target.value });
              }}
            />
            {enableAutoGenerate && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Auto Generate"
                onClick={handleGenerateSku}
                disabled={generatingSku}
                className="shrink-0"
              >
                {generatingSku ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Astroid className="h-4 w-4" />
                )}
                <span className="sr-only">Auto Generate</span>
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Product Code</Label>
          <div className="flex items-center gap-2">
            <Input
              value={value.productCode}
              className="flex-1"
              onChange={(e) => onChange({ productCode: e.target.value })}
            />
            {enableAutoGenerate && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title="Auto Generate"
                onClick={handleGenerateCode}
                disabled={generatingCode}
                className="shrink-0"
              >
                {generatingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Astroid className="h-4 w-4" />
                )}
                <span className="sr-only">Auto Generate</span>
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Input
            value={value.brand}
            placeholder="e.g. MSI, ASUS, TP-Link"
            onChange={(e) => onChange({ brand: e.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Categories</Label>
          <CategoryMultiSelect
            categories={categories}
            value={value.categories}
            onChange={(v) => {
              const patch: Partial<ProductFormValue> = { categories: v };
              if (enableAutoGenerate && !skuTouched && skuSuffix) {
                const catName =
                  categories.find((c) => c._id === v[0])?.name || '';
                const base = buildSkuBase(value.name, catName);
                patch.sku = base ? `${base}-${skuSuffix}` : skuSuffix;
              }
              onChange(patch);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Select one or more categories. The first one is the primary
            category.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Price ({currencySymbol})</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={value.price}
            onChange={(e) => onChange({ price: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">What customers pay</p>
        </div>
        <div className="space-y-1.5">
          <Label>Regular Price ({currencySymbol})</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={value.regularPrice}
            placeholder="Higher than price to show a discount"
            onChange={(e) =>
              onChange({ regularPrice: Number(e.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Original price (shown crossed out)
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Buy Price ({currencySymbol})</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={value.costPrice}
            placeholder="What you pay to buy it"
            onChange={(e) => onChange({ costPrice: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Purchase cost (hidden from customers)
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Stock</Label>
          <Input
            type="number"
            min={0}
            value={value.stock}
            onChange={(e) => onChange({ stock: Number(e.target.value) })}
          />
        </div>
        <ProfitSummary
          sellPrice={Number(value.price) || 0}
          regularPrice={Number(value.regularPrice) || 0}
          costPrice={Number(value.costPrice) || 0}
        />
        <div className="col-span-2 space-y-1.5">
          <Label>Status</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as Status })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Featured product
            </Label>
            <p className="text-xs text-muted-foreground">
              Highlight this product on the storefront.
            </p>
          </div>
          <Switch
            checked={value.featured}
            onCheckedChange={(v) => onChange({ featured: v })}
          />
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-rose-500" /> Holiday deal
            </Label>
            <p className="text-xs text-muted-foreground">
              Show this product under Top Holiday Deals on the storefront.
            </p>
          </div>
          <Switch
            checked={value.holiday}
            onCheckedChange={(v) => onChange({ holiday: v })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Short summary</Label>
          <Textarea
            rows={2}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="One-line summary shown in listings"
          />
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <h3 className="font-medium">Search Engine Optimization (SEO)</h3>
          <p className="text-xs text-muted-foreground">
            Helps Google show this product when customers search for it. Leave
            blank to auto-generate sensible defaults.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>URL Slug</Label>
            <Input
              value={value.slug}
              placeholder="auto-from-name"
              onChange={(e) => onChange({ slug: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              e.g. msi-27-inch-monitor
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Meta Title</Label>
            <Input
              value={value.metaTitle}
              placeholder="Shown as the browser tab and Google title"
              onChange={(e) => onChange({ metaTitle: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Meta Description</Label>
            <Textarea
              rows={2}
              value={value.metaDescription}
              placeholder="Short summary shown under the title in Google search results"
              onChange={(e) => onChange({ metaDescription: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Focus Keyword</Label>
            <Input
              value={value.focusKeyword}
              placeholder="e.g. msi monitor"
              onChange={(e) => onChange({ focusKeyword: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Image Alt Text</Label>
            <Input
              value={value.imageAlts}
              placeholder="Comma separated, e.g. MSI monitor front, MSI monitor side"
              onChange={(e) => onChange({ imageAlts: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Used for accessibility and image search
            </p>
          </div>
        </div>
      </div>

      <KeySpecsEditor
        value={value.keySpecs}
        onChange={(keySpecs) => onChange({ keySpecs })}
      />

      <KeyFeaturesEditor
        value={value.keyFeatures}
        onChange={(keyFeatures) => onChange({ keyFeatures })}
      />

      <ImageUploader
        value={value.images}
        onChange={(images) => onChange({ images })}
        files={imageFiles}
        onFilesChange={onImageFilesChange}
      />

      <SpecsEditor
        value={value.specs}
        onChange={(specs) => onChange({ specs })}
      />

      <PcPartEditor
        value={value.pcPart}
        onChange={(pcPart) => onChange({ pcPart })}
      />

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">
            Description (rich content)
          </Label>
          <p className="text-xs text-muted-foreground">
            Compose the product page with headings, text, images, lists and
            links.
          </p>
        </div>
        <RichTextEditor
          value={value.content}
          onChange={(content) => onChange({ content })}
          placeholder="Write the product description…"
        />
      </div>
    </div>
  );
}

// ── Sub-editors ────────────────────────────────────────────────────────────

function ProfitSummary({
  sellPrice,
  regularPrice,
  costPrice,
}: {
  sellPrice: number;
  regularPrice: number;
  costPrice: number;
}) {
  const { format } = useCurrency();
  const profit = sellPrice - costPrice;
  const hasCost = costPrice > 0;
  const margin = hasCost && sellPrice > 0 ? (profit / sellPrice) * 100 : null;
  const isLoss = profit < 0;

  return (
    <div className="col-span-2 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            Profit per unit
          </div>
          <div
            className={`text-xl font-bold ${
              isLoss
                ? 'text-destructive'
                : profit > 0
                  ? 'text-emerald-600'
                  : 'text-muted-foreground'
            }`}
          >
            {profit > 0 ? '+' : ''}
            {format(profit)}
          </div>
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Buy: </span>
            <span className="font-medium">{format(costPrice)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sell: </span>
            <span className="font-medium">{format(sellPrice)}</span>
          </div>
          {margin !== null && (
            <div>
              <span className="text-muted-foreground">Margin: </span>
              <span
                className={`font-medium ${
                  isLoss ? 'text-destructive' : 'text-emerald-600'
                }`}
              >
                {margin.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
      {!hasCost ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a buy price to see your profit on each sale.
        </p>
      ) : isLoss ? (
        <p className="mt-1 text-xs text-destructive">
          You&apos;re selling below your buy price — this item loses{' '}
          {format(Math.abs(profit))} per unit.
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {regularPrice > sellPrice
            ? 'Customers see the crossed-out regular price as the original.'
            : 'Profit = sell price − buy price.'}
        </p>
      )}
    </div>
  );
}

function KeySpecsEditor({
  value,
  onChange,
}: {
  value: KeySpec[];
  onChange: (v: KeySpec[]) => void;
}) {
  function addSpec() {
    onChange([...value, { id: uid(), label: '', value: '' }]);
  }
  function updateSpec(id: string, patch: Partial<KeySpec>) {
    onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeSpec(id: string) {
    onChange(value.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Key Specifications</h3>
          <p className="text-xs text-muted-foreground">
            These specs will be highlighted on the product card
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addSpec}>
          <Plus className="h-4 w-4 mr-1" /> Add spec
        </Button>
      </div>

      <div className="space-y-2">
        {value.map((spec) => (
          <div key={spec.id} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder="Label (e.g., Resolution)"
                value={spec.label}
                onChange={(e) =>
                  updateSpec(spec.id, { label: e.target.value })
                }
              />
              <Input
                placeholder="Value (e.g., FHD 1920x1080)"
                value={spec.value}
                onChange={(e) =>
                  updateSpec(spec.id, { value: e.target.value })
                }
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeSpec(spec.id)}
              className="mt-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {value.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No key specifications added yet
        </div>
      )}
    </div>
  );
}

function KeyFeaturesEditor({
  value,
  onChange,
}: {
  value: KeyFeature[];
  onChange: (v: KeyFeature[]) => void;
}) {
  function addFeature() {
    onChange([...value, { id: uid(), label: '', value: '' }]);
  }
  function updateFeature(id: string, patch: Partial<KeyFeature>) {
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeFeature(id: string) {
    onChange(value.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Key Features</h3>
          <p className="text-xs text-muted-foreground">
            Highlight main product features (e.g., Model, Processor, Memory,
            Storage, Graphics)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addFeature}>
          <Plus className="h-4 w-4 mr-1" /> Add feature
        </Button>
      </div>

      <div className="space-y-2">
        {value.map((feature) => (
          <div key={feature.id} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder="Label (e.g., Processor)"
                value={feature.label}
                onChange={(e) =>
                  updateFeature(feature.id, { label: e.target.value })
                }
              />
              <Input
                placeholder="Value (e.g., Intel Core Ultra 9 processor 285K)"
                value={feature.value}
                onChange={(e) =>
                  updateFeature(feature.id, { value: e.target.value })
                }
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeFeature(feature.id)}
              className="mt-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {value.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No key features added yet
        </div>
      )}
    </div>
  );
}

function SpecsEditor({
  value,
  onChange,
}: {
  value: SpecGroup[];
  onChange: (v: SpecGroup[]) => void;
}) {
  function addGroup() {
    onChange([
      ...value,
      {
        id: uid(),
        name: 'New group',
        fields: [{ id: uid(), label: '', value: '' }],
      },
    ]);
  }
  function updateGroup(id: string, patch: Partial<SpecGroup>) {
    onChange(value.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }
  function removeGroup(id: string) {
    onChange(value.filter((g) => g.id !== id));
  }
  function addField(gid: string) {
    onChange(
      value.map((g) =>
        g.id === gid
          ? {
              ...g,
              fields: [...g.fields, { id: uid(), label: '', value: '' }],
            }
          : g
      )
    );
  }
  function updateField(
    gid: string,
    fid: string,
    patch: Partial<SpecField>
  ) {
    onChange(
      value.map((g) =>
        g.id === gid
          ? {
              ...g,
              fields: g.fields.map((f) =>
                f.id === fid ? { ...f, ...patch } : f
              ),
            }
          : g
      )
    );
  }
  function removeField(gid: string, fid: string) {
    onChange(
      value.map((g) =>
        g.id === gid
          ? { ...g, fields: g.fields.filter((f) => f.id !== fid) }
          : g
      )
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Specifications</Label>
          <p className="text-xs text-muted-foreground">
            Group fields like Display, Processor, Battery, etc.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addGroup}>
          <Plus /> Add group
        </Button>
      </div>

      {value.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          No specification groups yet.
        </p>
      )}

      <div className="space-y-3">
        {value.map((g) => (
          <div key={g.id} className="rounded-md border">
            <div className="flex items-center gap-2 border-b bg-muted/40 p-2">
              <Input
                value={g.name}
                onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                placeholder="Group name (e.g. Display)"
                className="h-8 font-medium"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => removeGroup(g.id)}
                aria-label="Remove group"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 p-3">
              {g.fields.map((f) => (
                <div
                  key={f.id}
                  className="grid grid-cols-12 gap-2 items-start"
                >
                  <Input
                    className="col-span-4 h-8"
                    value={f.label}
                    onChange={(e) =>
                      updateField(g.id, f.id, { label: e.target.value })
                    }
                    placeholder="Label (e.g. Size)"
                  />
                  <Textarea
                    className="col-span-7 min-h-9 resize-none"
                    rows={1}
                    value={f.value}
                    onChange={(e) =>
                      updateField(g.id, f.id, { value: e.target.value })
                    }
                    placeholder="Value (e.g. 6.7 inch)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-1 h-8 w-8 text-destructive"
                    onClick={() => removeField(g.id, f.id)}
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addField(g.id)}
                className="h-7"
              >
                <Plus /> Add field
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
