'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SiteHeader } from '@/components/site-header';
import {
  categoryApi,
  productApi,
  productFilterApi,
  type Category,
  type ProductFilterSettings,
} from '@/lib/api';
import { buildFacetGroups, normalizeFacetKey } from '@/lib/specFilters';
import { toProductShape, type RawProduct } from '@/lib/productMapper';

const DEFAULT_CATEGORY = 'all';

function defaultSettings(
  categoryId: string,
  brand: string,
  facets: string[]
): ProductFilterSettings {
  return {
    categoryId,
    brand,
    price: true,
    rating: true,
    availability: true,
    facets,
  };
}

function settingsKey(categoryId: string, brand: string) {
  return JSON.stringify([categoryId, brand]);
}

function getCategoryProductNames(
  categories: Category[],
  categoryId: string
): Set<string> {
  const names = new Set<string>();
  const children = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = children.get(category.parentId) ?? [];
    list.push(category);
    children.set(category.parentId, list);
  }

  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    const category = categories.find((item) => item._id === id);
    if (!category) continue;
    names.add(category.name);
    for (const child of children.get(id) ?? []) stack.push(child._id);
  }
  return names;
}

export function ProductFiltersCms({
  mode = 'manage',
}: {
  mode?: 'manage' | 'new';
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<RawProduct[]>([]);
  const [savedSettings, setSavedSettings] = useState<
    Record<string, ProductFilterSettings>
  >({});
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY);
  const [brand, setBrand] = useState('');
  const [customFacet, setCustomFacet] = useState('');
  const [draft, setDraft] = useState<ProductFilterSettings>(
    defaultSettings(DEFAULT_CATEGORY, '', [])
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [categoryResult, productResult, filterResult] = await Promise.all(
          [
            categoryApi.getAll(),
            productApi.getAll({ limit: 1000 }),
            productFilterApi.getAll(),
          ]
        );
        setCategories(categoryResult.data.categories ?? []);
        setProducts(productResult.data.products ?? []);
        setSavedSettings(
          Object.fromEntries(
            (filterResult.data.settings ?? []).map((item) => [
              settingsKey(item.categoryId, item.brand || ''),
              item,
            ])
          )
        );
        setLoaded(true);
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            'Failed to load product filters'
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categoryNames = useMemo(
    () =>
      categoryId === DEFAULT_CATEGORY
        ? null
        : getCategoryProductNames(categories, categoryId),
    [categories, categoryId]
  );

  const scopedProducts = useMemo(
    () =>
      products
        .filter((product) => product.status !== 'draft')
        .filter(
          (product) =>
            !brand ||
            product.brand?.trim().toLocaleLowerCase() ===
              brand.toLocaleLowerCase()
        )
        .filter((product) => {
          if (!categoryNames) return true;
          const productCategories = product.categories ?? [];
          const names = productCategories.length
            ? productCategories
            : [product.category];
          return names.some((name) => categoryNames.has(name));
        })
        .map(toProductShape),
    [products, categoryNames, brand]
  );

  const facetGroups = useMemo(
    () => buildFacetGroups(scopedProducts),
    [scopedProducts]
  );

  const facetOptions = useMemo(() => {
    const keys = facetGroups.map((group) => group.key);
    if (
      scopedProducts.some((product) => product.brand?.trim()) &&
      !keys.includes('Brand')
    ) {
      keys.unshift('Brand');
    }
    return keys;
  }, [facetGroups, scopedProducts]);

  const brandOptions = useMemo(
    () =>
      [
        ...new Set(
          products
            .filter((product) => product.status !== 'draft')
            .filter((product) => {
              if (!categoryNames) return true;
              const productCategories = product.categories ?? [];
              const names = productCategories.length
                ? productCategories
                : [product.category];
              return names.some((name) => categoryNames.has(name));
            })
            .map((product) => product.brand?.trim())
            .filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [products, categoryNames]
  );

  const activeSettingsKey = settingsKey(categoryId, brand);

  useEffect(() => {
    if (!loaded) return;
    setDraft(
      savedSettings[activeSettingsKey] ??
        defaultSettings(categoryId, brand, facetOptions)
    );
  }, [activeSettingsKey, brand, categoryId, facetOptions, loaded, savedSettings]);

  const fieldOptions = useMemo(
    () =>
      [...new Set([...facetOptions, ...draft.facets])].map((key) => {
        const group = facetGroups.find((item) => item.key === key);
        const values =
          key === 'Brand'
            ? [
                ...new Set(
                  scopedProducts.map((product) => product.brand).filter(Boolean)
                ),
              ]
            : (group?.values.map((item) => item.value) ?? []);
        return { key, values };
      }),
    [draft.facets, facetGroups, facetOptions, scopedProducts]
  );

  const updateBoolean = (
    field: 'price' | 'rating' | 'availability',
    value: boolean
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const toggleFacet = (key: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      facets: checked
        ? [...current.facets, key]
        : current.facets.filter((facet) => facet !== key),
    }));
  };

  const addCustomFacet = () => {
    const key = normalizeFacetKey(customFacet);
    if (!key) {
      toast.error('Enter a filter field name');
      return;
    }
    if (draft.facets.includes(key)) {
      toast.error('That filter field is already selected');
      return;
    }
    setDraft((current) => ({ ...current, facets: [...current.facets, key] }));
    setCustomFacet('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await productFilterApi.save(draft);
      setSavedSettings((current) => ({
        ...current,
        [settingsKey(categoryId, brand)]: data.settings,
      }));
      toast.success('Product filters saved');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to save product filters'
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await productFilterApi.reset(categoryId, brand);
      setSavedSettings((current) => {
        const next = { ...current };
        delete next[activeSettingsKey];
        return next;
      });
      toast.success('Filters now use automatic defaults');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to reset product filters'
      );
    } finally {
      setSaving(false);
    }
  };

  const changeCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setBrand('');
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <SlidersHorizontal className="size-4" />
              Storefront
            </div>
            <h1 className="text-3xl font-bold text-gray-950">
              {mode === 'new' ? 'Create filter setup' : 'Product filters'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'new'
                ? 'Choose a category and optional brand, select the filters shoppers should see, then save. Saving an existing scope updates it.'
                : 'Choose which filters shoppers see on each category and brand.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={mode === 'new' ? '/admin/filters' : '/admin/filters/new'}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent"
            >
              {mode === 'new' ? 'Manage setups' : 'New setup'}
            </Link>
            {savedSettings[activeSettingsKey] && (
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                disabled={loading || saving}
              >
                <RotateCcw className="mr-2 size-4" />
                Reset to automatic
              </Button>
            )}
            <Button
              type="button"
              onClick={save}
              disabled={loading || saving || !loaded}
            >
              {saving ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save filters
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Category and brand settings</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                Brand settings override the category defaults after a shopper
                selects that brand. Unconfigured filters are discovered from
                the products.
              </p>
            </div>
            <select
              value={categoryId}
              onChange={(event) => changeCategory(event.target.value)}
              disabled={loading}
              aria-label="Choose a category"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
            >
              <option value={DEFAULT_CATEGORY}>All Products</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent className="space-y-7">
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                <LoaderCircle className="size-4 animate-spin" />
                Loading categories and product fields…
              </div>
            ) : (
              <>
                <section className="max-w-md">
                  <label
                    htmlFor="filter-brand"
                    className="mb-2 block text-sm font-medium text-gray-900"
                  >
                    Brand scope
                  </label>
                  <select
                    id="filter-brand"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All brands (category defaults)</option>
                    {brandOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">
                    Built-in filters
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        ['price', 'Price range', 'Filter by product price'],
                        ['rating', 'Quality', 'Filter by customer rating'],
                        [
                          'availability',
                          'Availability',
                          'Filter by stock status',
                        ],
                      ] as const
                    ).map(([key, title, description]) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-4 rounded-lg border p-4"
                      >
                        <span>
                          <span className="block text-sm font-medium text-gray-900">
                            {title}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {description}
                          </span>
                        </span>
                        <Switch
                          checked={draft[key]}
                          onCheckedChange={(checked) =>
                            updateBoolean(key, checked)
                          }
                          aria-label={`Show ${title} filter`}
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Product specifications
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Values stay dynamic and come from the products in this
                        category.
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {fieldOptions.length} available
                    </span>
                  </div>
                  {fieldOptions.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {fieldOptions.map(({ key, values }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={draft.facets.includes(key)}
                            onChange={(event) =>
                              toggleFacet(key, event.target.checked)
                            }
                            className="mt-1 size-4 accent-blue-600"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-900">
                              {key}
                            </span>
                            <span className="mt-1 block truncate text-xs text-gray-500">
                              {values.slice(0, 4).join(', ') ||
                                'No product values yet'}
                              {values.length > 4 ? ', …' : ''}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-gray-500">
                      No specification fields found for this category yet.
                    </p>
                  )}
                  <div className="mt-4 flex max-w-lg gap-2">
                    <input
                      value={customFacet}
                      onChange={(event) => setCustomFacet(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomFacet();
                        }
                      }}
                      placeholder="Add a field, e.g. SIM Support"
                      aria-label="Custom filter field name"
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <Button type="button" variant="outline" onClick={addCustomFacet}>
                      <Plus className="mr-2 size-4" />
                      Add field
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Custom fields appear on the storefront when products in
                    this scope have matching specification values.
                  </p>
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
