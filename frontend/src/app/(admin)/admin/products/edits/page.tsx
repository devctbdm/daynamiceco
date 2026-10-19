'use client';

import {
  EMPTY_FORM_VALUE,
  ProductForm,
  ProductFormValue,
  contentToHtml,
  parseSpecifications,
} from '@/components/admin/products/ProductForm';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { categoryApi, productApi } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function EditsProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');

  const [categories, setCategories] = useState<
    { _id: string; name: string; parentId: string | null }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [form, setForm] = useState<ProductFormValue>({
    ...EMPTY_FORM_VALUE,
    pcPart: { ...EMPTY_FORM_VALUE.pcPart },
  });

  useEffect(() => {
    categoryApi
      .getAll()
      .then(({ data }) => {
        if (data.success) setCategories(data.categories);
      })
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  useEffect(() => {
    if (!productId) {
      toast.error('No product ID provided');
      router.push('/admin/products');
      return;
    }
    productApi
      .getById(productId)
      .then(({ data }) => {
        if (data.success) {
          const p = data.product;
          const parsed = parseSpecifications(p.specifications || {});
          const existingContent = contentToHtml(p.content);
          setForm({
            name: p.name || '',
            sku: p.sku || '',
            productCode: p.productCode || '',
            brand:
              p.brand ||
              p.specifications?.brand ||
              p.specifications?._keySpecs?.Brand ||
              '',
            slug: p.slug || '',
            metaTitle: p.seo?.metaTitle || '',
            metaDescription: p.seo?.metaDescription || '',
            focusKeyword: p.seo?.focusKeyword || '',
            imageAlts: (p.imageAlts || []).join(', '),
            categories: p.categories?.length
              ? p.categories
              : p.category
                ? [p.category]
                : [],
            price: p.discountPrice > 0 ? p.discountPrice : p.price || 0,
            regularPrice: p.price || 0,
            costPrice: p.costPrice || 0,
            stock: p.stock || 0,
            status: p.status || 'active',
            featured: p.featured || false,
            holiday: p.holiday || false,
            description: p.description || '',
            images: p.images || [],
            keySpecs: parsed.keySpecs,
            keyFeatures: parsed.keyFeatures,
            specs: parsed.specGroups,
            content: existingContent,
            pcPart: p.pcPart
              ? {
                  enabled: !!p.pcPart.enabled,
                  type: p.pcPart.type || '',
                  socket: p.pcPart.socket || '',
                  platform: p.pcPart.platform || '',
                  formFactor: p.pcPart.formFactor || '',
                  wattage: Number(p.pcPart.wattage) || 0,
                  specs: p.pcPart.specs || {},
                }
              : { ...EMPTY_FORM_VALUE.pcPart },
          });
        } else {
          toast.error('Product not found');
          router.push('/admin/products');
        }
      })
      .catch(() => {
        toast.error('Failed to load product');
        router.push('/admin/products');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!form.categories.length) {
      toast.error('Please select at least one category');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      const sale = Number(form.price) || 0;
      const regular = Number(form.regularPrice) || 0;
      if (regular > 0 && regular > sale) {
        fd.append('price', String(regular));
        fd.append('discountPrice', String(sale));
      } else {
        fd.append('price', String(sale));
        fd.append('discountPrice', '0');
      }
      fd.append('category', form.categories[0]);
      fd.append('categories', JSON.stringify(form.categories));
      fd.append('costPrice', String(Number(form.costPrice) || 0));
      fd.append('stock', String(form.stock));
      fd.append('status', form.status);
      fd.append('featured', String(form.featured));
      fd.append('holiday', String(form.holiday));
      if (form.sku) fd.append('sku', form.sku);
      if (form.productCode) fd.append('productCode', form.productCode);
      if (form.brand) fd.append('brand', form.brand);
      if (form.slug) fd.append('slug', form.slug);
      if (form.metaTitle) fd.append('metaTitle', form.metaTitle);
      if (form.metaDescription)
        fd.append('metaDescription', form.metaDescription);
      if (form.focusKeyword) fd.append('focusKeyword', form.focusKeyword);
      if (form.imageAlts.trim())
        fd.append(
          'imageAlts',
          JSON.stringify(
            form.imageAlts
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          )
        );

      const specs: Record<string, any> = {
        _keySpecs: {},
        _keyFeatures: {},
        _specGroups: {},
      };
      if (form.brand) {
        specs._keySpecs.Brand = form.brand;
        specs.brand = form.brand;
      }
      form.keySpecs.forEach((s) => {
        if (s.label) specs._keySpecs[s.label] = s.value;
      });
      form.keyFeatures.forEach((f) => {
        if (f.label) specs._keyFeatures[f.label] = f.value;
      });
      form.specs.forEach((g) => {
        specs._specGroups[g.name] = {};
        g.fields.forEach((f) => {
          if (f.label) specs._specGroups[g.name][f.label] = f.value;
        });
      });
      fd.append('specifications', JSON.stringify(specs));
      fd.append('content', form.content ?? '');
      fd.append('pcPart', JSON.stringify(form.pcPart));

      imageFiles.forEach((file) => fd.append('images', file));

      const { data } = await productApi.update(productId!, fd);
      if (data.success) {
        toast.success(`Product "${form.name}" updated`);
        router.push('/admin/products');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading product...
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
            <h1 className="text-2xl font-semibold tracking-tight">
              Edit Product
            </h1>
            <p className="text-sm text-muted-foreground">
              Update product details.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <ProductForm
              value={form}
              onChange={(v) => setForm((prev) => ({ ...prev, ...v }))}
              categories={categories}
              imageFiles={imageFiles}
              onImageFilesChange={setImageFiles}
            />
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
