'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Eye,
  FolderTree,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SiteHeader } from '@/components/site-header';
import { categoryApi, type Category, type CategoryForm } from '@/lib/api';

type FormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  active: boolean;
  imageUrl: string;
  bannerUrl: string;
  featured: boolean;
  sortOrder: number;
  color: string;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  parentId: 'root',
  active: true,
  imageUrl: '',
  bannerUrl: '',
  featured: false,
  sortOrder: 0,
  color: '#0071e3',
};

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function NewCategoryPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initial, setInitial] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [orderTouched, setOrderTouched] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileRef = useRef<File | null>(null);
  const bannerFileRef = useRef<File | null>(null);

  const nextOrderFor = (parentId: string) => {
    const siblings = categories.filter(
      (c) => (c.parentId ?? 'root') === (parentId || 'root')
    );
    return siblings.length
      ? Math.max(...siblings.map((s) => s.sortOrder)) + 1
      : 1;
  };

  useEffect(() => {
    categoryApi
      .getAll()
      .then(({ data }) => {
        const items = data.categories ?? [];
        setCategories(items);
        const siblings = items.filter((c) => !c.parentId);
        const order = siblings.length
          ? Math.max(...siblings.map((s) => s.sortOrder)) + 1
          : 1;
        const seed = { ...emptyForm, sortOrder: order };
        setForm(seed);
        setInitial(seed);
      })
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initial) ||
    !!imageFileRef.current ||
    !!bannerFileRef.current;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const parentOptions = useMemo(() => {
    const byId = new Map(categories.map((c) => [c._id, c]));
    const pathOf = (c: Category): string => {
      const parts: string[] = [c.name];
      let cur = c.parentId ? byId.get(c.parentId) : undefined;
      while (cur) {
        parts.unshift(cur.name);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return parts.join(' / ');
    };
    return [
      { id: 'root', label: '— Root (no parent) —' },
      ...categories
        .map((c) => ({ id: c._id, label: pathOf(c) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [categories]);

  const parentPath = useMemo(() => {
    if (form.parentId === 'root') return 'Root';
    const byId = new Map(categories.map((c) => [c._id, c]));
    const parts: string[] = [];
    let cur = byId.get(form.parentId);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.length ? `Root / ${parts.join(' / ')}` : 'Root';
  }, [form.parentId, categories]);

  function handleBack() {
    if (isDirty) setConfirmLeave(true);
    else router.back();
  }

  function handleParentChange(parentId: string) {
    setForm((f) => ({
      ...f,
      parentId,
      sortOrder: orderTouched ? f.sortOrder : nextOrderFor(parentId),
    }));
  }

  async function handleImagePick(
    kind: 'imageUrl' | 'bannerUrl',
    file: File | null
  ) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4MB');
      return;
    }
    const dataUrl = await readFileToDataUrl(file);
    setForm((f) => ({ ...f, [kind]: dataUrl }));
    if (kind === 'imageUrl') imageFileRef.current = file;
    else bannerFileRef.current = file;
    toast.success('Image loaded');
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    const slug = (form.slug.trim() || slugify(name)).toLowerCase();
    const parentId = form.parentId === 'root' ? null : form.parentId;

    const payload: CategoryForm = {
      name,
      slug,
      description: form.description,
      parentId,
      active: form.active,
      imageUrl: form.imageUrl,
      bannerUrl: form.bannerUrl,
      featured: form.featured,
      sortOrder: form.sortOrder || 1,
      color: form.color,
    };

    setSubmitting(true);
    try {
      await categoryApi.create(payload, {
        image: imageFileRef.current,
        banner: bannerFileRef.current,
      });
      toast.success('Category created');
      router.push('/admin/categories');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to create category'
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </>
    );
  }

  const slugPreview = form.slug.trim() || slugify(form.name) || 'category-slug';

  return (
    <>
      <SiteHeader />
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <FolderTree className="h-6 w-6" /> New Category
            </h1>
            <p className="text-sm text-muted-foreground">
              Create a root or nested category for your catalog.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main column ───────────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="grid gap-2">
                    <div className="relative h-28 w-28 overflow-hidden rounded-md border">
                      {form.imageUrl ? (
                        <Image
                          src={form.imageUrl}
                          alt="Category"
                          className="h-full w-full object-cover"
                          width={112}
                          height={112}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                          <ImagePlus className="h-6 w-6" />
                          <span className="text-[10px]">No image</span>
                        </div>
                      )}
                      {form.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, imageUrl: '' }));
                            imageFileRef.current = null;
                          }}
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) =>
                        handleImagePick(
                          'imageUrl',
                          e.target.files?.[0] ?? null
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" /> Upload image
                    </Button>
                  </div>

                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="cat-banner-url">Banner (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cat-banner-url"
                        value={form.bannerUrl}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, bannerUrl: e.target.value }))
                        }
                        placeholder="Wide banner for the category page"
                      />
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          handleImagePick(
                            'bannerUrl',
                            e.target.files?.[0] ?? null
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.bannerUrl && (
                      <div className="mt-1 h-20 overflow-hidden rounded-md border">
                        <Image
                          src={form.bannerUrl}
                          alt="Banner"
                          className="h-full w-full object-cover"
                          width={80}
                          height={80}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="cat-name">Name</Label>
                    <Input
                      id="cat-name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          name: e.target.value,
                          slug: slugTouched ? f.slug : slugify(e.target.value),
                        }))
                      }
                      placeholder="e.g. iPhone 16 Pro"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cat-slug">Slug</Label>
                    <Input
                      id="cat-slug"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm((f) => ({ ...f, slug: e.target.value }));
                      }}
                      placeholder="iphone-16-pro"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cat-description">Description</Label>
                  <Textarea
                    id="cat-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Optional description shown on the category page"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Side column ───────────────────────────────────────────── */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Placement</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Parent category</Label>
                  <Select
                    value={form.parentId}
                    onValueChange={(v) => handleParentChange(v as string)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cat-order">Sort order</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => {
                      setOrderTouched(true);
                      setForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }));
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cat-color">Accent color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cat-color"
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={form.color}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visibility</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 text-amber-500" /> Featured
                  </span>
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, featured: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">
                      Visible on storefront
                    </div>
                  </div>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, active: v }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" /> Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderTree className="h-3.5 w-3.5" /> {parentPath}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="relative mb-3 h-24 overflow-hidden rounded-md bg-muted">
                    {form.imageUrl ? (
                      <Image
                        src={form.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Palette className="h-6 w-6" />
                      </div>
                    )}
                    <span
                      className="absolute inset-x-0 bottom-0 h-1"
                      style={{ backgroundColor: form.color }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: form.color }}
                    />
                    <span className="truncate text-sm font-medium">
                      {form.name.trim() || 'New category'}
                    </span>
                    {form.featured && (
                      <Badge variant="secondary" className="ml-auto shrink-0">
                        <Star className="h-3 w-3" /> Featured
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    /{slugPreview}
                  </div>
                  {!form.active && (
                    <Badge variant="outline" className="mt-2">
                      Hidden
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Create category
              </>
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this category?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Leaving this page will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push('/admin/categories')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
