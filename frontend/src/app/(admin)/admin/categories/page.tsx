'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Folder,
  FolderOpen,
  Search,
  Eye,
  EyeOff,
  Star,
  StarOff,
  ImagePlus,
  ImageIcon,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { categoryApi, type Category, type CategoryForm } from '@/lib/api';
import { categoriesResource } from '@/lib/resources';
import { SiteHeader } from '@/components/site-header';

function normalize(c: Category): Category & { productCount: number } {
  return { ...c, productCount: (c as any).productCount ?? 0 };
}

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<
    (Category & { productCount: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileRef = useRef<File | null>(null);
  const bannerFileRef = useRef<File | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Admin may have changed categories — drop the shared storefront cache.
      categoriesResource.invalidate();
      const { data } = await categoryApi.getAll();
      const items = (data.categories ?? []).map(normalize);
      setCategories(items);
      const rootIds = items.filter((c) => !c.parentId).map((c) => c._id);
      setExpanded(new Set(rootIds));
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load categories'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const stats = useMemo(() => {
    const total = categories.length;
    const root = categories.filter((c) => c.parentId === null).length;
    const active = categories.filter((c) => c.active).length;
    const featured = categories.filter((c) => c.featured).length;
    const products = categories.reduce((s, c) => s + c.productCount, 0);
    return { total, root, active, featured, products };
  }, [categories]);

  const childrenMap = useMemo(() => {
    const m = new Map<string | null, (Category & { productCount: number })[]>();
    for (const c of categories) {
      const key = c.parentId ?? null;
      const list = m.get(key) ?? [];
      list.push(c);
      m.set(key, list);
    }
    for (const [, list] of m) {
      list.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      );
    }
    return m;
  }, [categories]);

  const q = search.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (!q && !featuredOnly) return null;
    const ids = new Set<string>();
    const byId = new Map(categories.map((c) => [c._id, c]));
    for (const c of categories) {
      const textMatch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q);
      const featMatch = !featuredOnly || c.featured;
      if (textMatch && featMatch) {
        let cur: (Category & { productCount: number }) | undefined = c;
        while (cur) {
          ids.add(cur._id);
          cur = cur.parentId ? byId.get(cur.parentId) : undefined;
        }
      }
    }
    return ids;
  }, [q, featuredOnly, categories]);

  const featuredList = useMemo(
    () =>
      categories
        .filter((c) => c.featured && c.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function openCreate(parentId: string | null) {
    setEditing(null);
    const siblings = childrenMap.get(parentId) ?? [];
    const nextOrder = siblings.length
      ? Math.max(...siblings.map((s) => s.sortOrder)) + 1
      : 1;
    setForm({
      ...emptyForm,
      parentId: parentId ?? 'root',
      sortOrder: nextOrder,
    });
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      parentId: cat.parentId ?? 'root',
      active: cat.active,
      imageUrl: cat.imageUrl,
      bannerUrl: cat.bannerUrl,
      featured: cat.featured,
      sortOrder: cat.sortOrder,
      color: cat.color,
    });
    setDialogOpen(true);
  }

  function getDescendantIds(id: string): Set<string> {
    const out = new Set<string>();
    const walk = (pid: string) => {
      for (const c of childrenMap.get(pid) ?? []) {
        out.add(c._id);
        walk(c._id);
      }
    };
    walk(id);
    return out;
  }

  const parentOptions = useMemo(() => {
    const blocked = editing
      ? new Set([editing._id, ...getDescendantIds(editing._id)])
      : new Set<string>();
    const list: { id: string; label: string }[] = [
      { id: 'root', label: '— Root (no parent) —' },
    ];
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
    for (const c of categories) {
      if (blocked.has(c._id)) continue;
      list.push({ id: c._id, label: pathOf(c) });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, editing]);

  function readFileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
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
    const imageUrl = form.imageUrl;

    const payload: CategoryForm = {
      name,
      slug,
      description: form.description,
      parentId,
      active: form.active,
      imageUrl,
      bannerUrl: form.bannerUrl,
      featured: form.featured,
      sortOrder: form.sortOrder || 1,
      color: form.color,
    };

    const files = {
      image: imageFileRef.current,
      banner: bannerFileRef.current,
    };

    try {
      setSaving(true);
      if (editing) {
        await categoryApi.update(editing._id, payload, files);
        toast.success('Category updated');
      } else {
        const { data } = await categoryApi.create(payload, files);
        if (parentId) {
          setExpanded((prev) => new Set(prev).add(parentId));
        }
        toast.success('Category created');
      }
      setDialogOpen(false);
      imageFileRef.current = null;
      bannerFileRef.current = null;
      await fetchCategories();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to create category'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await categoryApi.delete(deleteTarget._id);
      toast.success(`Deleted "${deleteTarget.name}" and all sub-categories`);
      setDeleteTarget(null);
      await fetchCategories();
    } catch {
      toast.error('Failed to delete category');
    }
  }

  async function toggleActive(cat: Category) {
    try {
      await categoryApi.update(cat._id, { active: !cat.active });
      toast.success(`${cat.name} ${cat.active ? 'hidden' : 'activated'}`);
      await fetchCategories();
    } catch {
      toast.error('Failed to update category');
    }
  }

  async function toggleFeatured(cat: Category) {
    try {
      await categoryApi.update(cat._id, { featured: !cat.featured });
      toast.success(
        `${cat.name} ${cat.featured ? 'removed from' : 'added to'} homepage featured`
      );
      await fetchCategories();
    } catch {
      toast.error('Failed to update category');
    }
  }

  async function move(cat: Category, dir: -1 | 1) {
    const siblings = (childrenMap.get(cat.parentId) ?? []).slice();
    const idx = siblings.findIndex((s) => s._id === cat._id);
    const swap = siblings[idx + dir];
    if (!swap) return;

    const orders = [
      { id: cat._id, sortOrder: swap.sortOrder },
      { id: swap._id, sortOrder: cat.sortOrder },
    ];

    try {
      await categoryApi.reorder(orders);
      await fetchCategories();
    } catch {
      toast.error('Failed to reorder');
    }
  }

  function renderNode(cat: Category & { productCount: number }, depth: number) {
    if (matchIds && !matchIds.has(cat._id)) return null;
    const kids = childrenMap.get(cat._id) ?? [];
    const hasKids = kids.length > 0;
    const isOpen = expanded.has(cat._id) || !!matchIds;

    return (
      <div key={cat._id}>
        <div
          className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-muted/50"
          style={{ paddingLeft: depth * 20 + 8 }}
        >
          <button
            type="button"
            onClick={() => hasKids && toggle(cat._id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
            aria-label={hasKids ? (isOpen ? 'Collapse' : 'Expand') : undefined}
          >
            {hasKids ? (
              isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="h-4 w-4" />
            )}
          </button>

          <div
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-muted"
            style={{ boxShadow: `inset 0 0 0 2px ${cat.color}22` }}
          >
            {cat.imageUrl ? (
              <Image
                src={cat.imageUrl}
                alt={cat.name}
                className="h-full w-full object-cover"
                width={36}
                height={36}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
              </div>
            )}
          </div>

          {hasKids ? (
            isOpen ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-primary" />
            )
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{cat.name}</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                /{cat.slug}
              </span>
              {cat.featured && (
                <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </Badge>
              )}
              {!cat.active && (
                <Badge variant="secondary" className="text-xs">
                  Hidden
                </Badge>
              )}
            </div>
          </div>

          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            {cat.productCount} products
          </Badge>

          <div className="flex shrink-0 items-center gap-0.5 opacity-70 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => move(cat, -1)}
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => move(cat, 1)}
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleFeatured(cat)}
              title={cat.featured ? 'Unfeature' : 'Feature on homepage'}
            >
              {cat.featured ? (
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openCreate(cat._id)}
              title="Add sub-category"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleActive(cat)}
              title={cat.active ? 'Hide' : 'Show'}
            >
              {cat.active ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEdit(cat)}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(cat)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isOpen && hasKids && (
          <div>{kids.map((k) => renderNode(k, depth + 1))}</div>
        )}
      </div>
    );
  }

  const roots = childrenMap.get(null) ?? [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  return (
    <>
      {' '}
      <SiteHeader />
      <div className="space-y-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <FolderTree className="h-6 w-6" /> Categories
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage nested product categories, images, and homepage featured
              section.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => openCreate(null)}>
              <Plus className="mr-2 h-4 w-4" /> Quick add
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/admin/categories/new" />}
            >
              <Plus className="mr-2 h-4 w-4" /> New Root Category
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Root" value={stats.root} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Featured" value={stats.featured} />
          <StatCard label="Products" value={stats.products} />
        </div>

        <Tabs defaultValue="tree" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tree">Tree</TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="space-y-4">
            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Category tree</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <Switch
                      checked={featuredOnly}
                      onCheckedChange={setFeaturedOnly}
                    />
                    <span>Featured only</span>
                  </label>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search categories…"
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {roots.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No categories yet.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {roots.map((r) => renderNode(r, 0))}
                  </div>
                )}
                {matchIds && matchIds.size === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No matches.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => {
            if (saving) return;
            if (!o) {
              imageFileRef.current = null;
              bannerFileRef.current = null;
            }
            setDialogOpen(o);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit category' : 'New category'}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Update the category details, image, and homepage feature settings.'
                  : 'Create a new category or sub-category.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative h-28 w-28 overflow-hidden rounded-lg border bg-muted">
                    {form.imageUrl ? (
                      <Image
                        src={form.imageUrl}
                        alt="Category"
                        className="h-full w-full object-cover"
                        width={112}
                        height={112}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
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
                      handleImagePick('imageUrl', e.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-28"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cat-image-url">Image URL</Label>
                  <Input
                    id="cat-image-url"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    placeholder="https://… or upload"
                  />
                  <p className="text-xs text-muted-foreground">
                    Square image works best (used on homepage tiles).
                  </p>

                  <Label htmlFor="cat-banner-url" className="mt-2">
                    Banner URL (optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="cat-banner-url"
                      value={form.bannerUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bannerUrl: e.target.value }))
                      }
                      placeholder="Wide banner for category page"
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
                        slug: editing ? f.slug : slugify(e.target.value),
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }
                    placeholder="iphone-16-pro"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Parent category</Label>
                <Select
                  value={form.parentId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, parentId: v ?? 'root' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 w-auto overflow-x-auto">
                    {parentOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="cat-order">Sort order</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
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
                <div className="grid gap-2">
                  <Label>&nbsp;</Label>
                  <div className="flex h-10 items-center justify-between rounded-md border px-3">
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
                </div>
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
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editing ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  <>{editing ? 'Save changes' : 'Create category'}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete "{deleteTarget?.name}"?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this category
                {deleteTarget && getDescendantIds(deleteTarget._id).size > 0
                  ? ` and ${getDescendantIds(deleteTarget._id).size} nested sub-categories.`
                  : '.'}{' '}
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
