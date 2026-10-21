'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Info,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  sliderApi,
  type Slider,
  type SliderForm,
  type SliderSetting,
  type SliderType,
} from '@/lib/api';

const IMAGE_DIMENSIONS: Record<SliderType, string> = {
  hero: 'Recommended image dimensions: 982 × 500 px.',
  ad_top: 'Recommended image dimensions: 315 × 252 px.',
  ad_bottom: 'Recommended image dimensions: 315 × 252 px.',
};

const TYPE_LABEL: Record<SliderType, string> = {
  hero: 'Main slide',
  ad_top: 'Top advertisement',
  ad_bottom: 'Bottom advertisement',
};

const DEFAULT_SETTING: SliderSetting = {
  enabled: true,
  autoSlide: true,
  interval: 5,
};

const EMPTY_FORM: SliderForm = {
  image: '',
  link: '',
  type: 'hero',
  active: true,
  sortOrder: 0,
};

function validLink(link: string) {
  const value = link.trim();
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function SliderRow({
  slider,
  index,
  count,
  onEdit,
  onDelete,
  onToggle,
  onMove,
}: {
  slider: Slider;
  index: number;
  count: number;
  onEdit: (slider: Slider) => void;
  onDelete: (slider: Slider) => void;
  onToggle: (slider: Slider) => void;
  onMove?: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div
          className={`relative w-full shrink-0 overflow-hidden rounded-md border bg-muted sm:w-48 ${
            slider.type === 'hero' ? 'aspect-[1.96/1]' : 'aspect-[5/4]'
          }`}
        >
          {slider.image ? (
            <Image
              src={slider.image}
              alt="Homepage promotion"
              fill
              sizes="192px"
              className={
                slider.type === 'hero' ? 'object-cover' : 'object-contain'
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{TYPE_LABEL[slider.type]}</p>
            <Badge variant={slider.active ? 'secondary' : 'outline'}>
              {slider.active ? 'Visible' : 'Hidden'}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {slider.link || 'No destination link'}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Switch
              aria-label={`Show ${TYPE_LABEL[slider.type].toLowerCase()}`}
              checked={slider.active}
              onCheckedChange={() => onToggle(slider)}
            />
            <span className="text-sm text-muted-foreground">
              Show on homepage
            </span>
          </div>
        </div>
        {onMove && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move slide up"
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move slide down"
              disabled={index === count - 1}
              onClick={() => onMove(index, 1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Replace or edit image"
            onClick={() => onEdit(slider)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Delete promotion"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(slider)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderRowSkeleton({
  type,
  withReorder = false,
}: {
  type: SliderType;
  withReorder?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <Skeleton
          className={`w-full shrink-0 rounded-md sm:w-48 ${
            type === 'hero' ? 'aspect-[1.96/1]' : 'aspect-[5/4]'
          }`}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/5" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {withReorder && (
          <div className="flex items-center gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function SliderSettingsSkeleton() {
  return (
    <>
      {[
        { label: 'Main slider', description: 'w-44', control: 'h-5 w-9 rounded-full' },
        { label: 'Auto-slide', description: 'w-56', control: 'h-5 w-9 rounded-full' },
        { label: 'Slide interval', description: 'w-28', control: 'h-8 w-36' },
      ].map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className={`h-3.5 ${row.description}`} />
          </div>
          <Skeleton className={row.control} />
        </div>
      ))}
    </>
  );
}

export default function SliderPage() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [setting, setSetting] = useState<SliderSetting>(DEFAULT_SETTING);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingSetting, setSavingSetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Slider | null>(null);
  const [form, setForm] = useState<SliderForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Slider | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const imageFile = useRef<File | null>(null);
  const previewUrl = useRef<string | null>(null);

  const fetchSliders = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const { data } = await sliderApi.getAll();
      setSliders(data.sliders ?? []);
      setSetting(data.setting ?? DEFAULT_SETTING);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load slider settings';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSliders();
  }, [fetchSliders]);

  const heroSlides = useMemo(
    () =>
      sliders
        .filter((slider) => slider.type === 'hero')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [sliders]
  );

  const clearPreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    imageFile.current = null;
  };

  const openCreate = (type: SliderType) => {
    clearPreview();
    setEditing(null);
    const count = sliders.filter((slider) => slider.type === type).length;
    setForm({ ...EMPTY_FORM, type, sortOrder: count });
    setDialogOpen(true);
  };

  const openEdit = (slider: Slider) => {
    clearPreview();
    setEditing(slider);
    setForm({
      image: slider.image,
      link: slider.link ?? '',
      type: slider.type,
      active: slider.active,
      sortOrder: slider.sortOrder,
    });
    setDialogOpen(true);
  };

  const selectImage = (file?: File) => {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
        file.type
      )
    ) {
      toast.error('Choose a JPG, PNG, GIF, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5 MB or smaller.');
      return;
    }
    clearPreview();
    const objectUrl = URL.createObjectURL(file);
    previewUrl.current = objectUrl;
    imageFile.current = file;
    setForm((current) => ({ ...current, image: objectUrl }));
  };

  const save = async () => {
    if (!form.image && !editing) {
      toast.error('Upload an image before saving.');
      return;
    }
    if (!validLink(form.link)) {
      toast.error(
        'Enter an internal path (for example, /products) or a valid HTTP(S) URL.'
      );
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        image: imageFile.current ? '' : form.image,
        link: form.link.trim(),
      };
      if (editing) {
        await sliderApi.update(editing._id, payload, imageFile.current);
        toast.success('Promotion updated.');
      } else {
        await sliderApi.create(payload, imageFile.current);
        toast.success('Promotion added.');
      }
      setDialogOpen(false);
      clearPreview();
      await fetchSliders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save promotion.'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = async (patch: Partial<SliderSetting>) => {
    const previous = setting;
    const next = { ...setting, ...patch };
    setSetting(next);
    setSavingSetting(true);
    try {
      const { data } = await sliderApi.updateSetting(patch);
      setSetting(data.setting);
    } catch (error) {
      setSetting(previous);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update slider settings.'
      );
    } finally {
      setSavingSetting(false);
    }
  };

  const toggleActive = async (slider: Slider) => {
    try {
      await sliderApi.update(slider._id, { active: !slider.active });
      setSliders((current) =>
        current.map((item) =>
          item._id === slider._id ? { ...item, active: !item.active } : item
        )
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update visibility.'
      );
    }
  };

  const moveSlide = async (index: number, direction: -1 | 1) => {
    const reordered = [...heroSlides];
    const target = index + direction;
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    try {
      await sliderApi.reorder(
        reordered.map((slide, sortOrder) => ({ id: slide._id, sortOrder }))
      );
      setSliders((current) =>
        current.map((slide) => {
          const order = reordered.findIndex((item) => item._id === slide._id);
          return slide.type === 'hero' && order !== -1
            ? { ...slide, sortOrder: order }
            : slide;
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reorder slides.'
      );
    }
  };

  const removePromotion = async () => {
    if (!deleteTarget) return;
    try {
      await sliderApi.delete(deleteTarget._id);
      setSliders((current) =>
        current.filter((slide) => slide._id !== deleteTarget._id)
      );
      setDeleteTarget(null);
      toast.success('Promotion deleted.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete promotion.'
      );
    }
  };

  const renderRows = (items: Slider[], canReorder = false) =>
    items.map((slider, index) => (
      <SliderRow
        key={slider._id}
        slider={slider}
        index={index}
        count={items.length}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onToggle={toggleActive}
        onMove={canReorder ? moveSlide : undefined}
      />
    ));

  return (
    <div>
      <SiteHeader />
      <div className="space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Homepage slider</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the main carousel and the two homepage advertisements.
          </p>
        </div>
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{loadError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchSliders()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card aria-busy={loading}>
          <CardHeader>
            <CardTitle>Slider settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-3">
            {loading ? (
              <SliderSettingsSkeleton />
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="main-slider-toggle">Main slider</Label>
                  <p className="text-sm text-muted-foreground">
                    Show enabled slides on the homepage.
                  </p>
                </div>
                <Switch
                  id="main-slider-toggle"
                  checked={setting.enabled}
                  disabled={savingSetting || loading}
                  onCheckedChange={(enabled) => void updateSetting({ enabled })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="auto-slide-toggle">Auto-slide</Label>
                  <p className="text-sm text-muted-foreground">
                    Manual navigation remains available when off.
                  </p>
                </div>
                <Switch
                  id="auto-slide-toggle"
                  checked={setting.autoSlide}
                  disabled={savingSetting || loading}
                  onCheckedChange={(autoSlide) =>
                    void updateSetting({ autoSlide })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="slide-interval">Slide interval</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose 3–10 seconds.
                  </p>
                </div>
                <Select
                  value={String(setting.interval)}
                  disabled={savingSetting || loading}
                  onValueChange={(value) =>
                    value && void updateSetting({ interval: Number(value) })
                  }
                >
                  <SelectTrigger id="slide-interval" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }, (_, index) => index + 3).map(
                      (seconds) => (
                        <SelectItem key={seconds} value={String(seconds)}>
                          {seconds} seconds
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              </>
            )}
          </CardContent>
        </Card>
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Main slides</h2>
              <p className="text-sm text-muted-foreground">
                Recommended image size: 982 × 500 px.
              </p>
            </div>
            <Button onClick={() => openCreate('hero')} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" /> Add slide
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only" role="status">
                Loading main slides…
              </span>
              {[0, 1].map((item) => (
                <SliderRowSkeleton key={item} type="hero" withReorder />
              ))}
            </div>
          ) : heroSlides.length ? (
            <div className="space-y-3">{renderRows(heroSlides, true)}</div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No main slides have been added yet.
              </p>
              <Button variant="outline" onClick={() => openCreate('hero')}>
                Add the first slide
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Advertisements</h2>
            <p className="text-sm text-muted-foreground">
              One advertisement appears in each fixed homepage slot.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {(['ad_top', 'ad_bottom'] as const).map((type) => {
              const items = sliders
                .filter((slider) => slider.type === type)
                .sort((a, b) => a.sortOrder - b.sortOrder);
              return (
                <Card key={type} aria-busy={loading}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>{TYPE_LABEL[type]}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        315 × 252 px recommended.
                      </p>
                    </div>
                    {!items.length && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreate(type)}
                        disabled={loading}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading ? (
                      <div aria-busy="true">
                        <span className="sr-only" role="status">
                          Loading {TYPE_LABEL[type].toLowerCase()}…
                        </span>
                        <SliderRowSkeleton type={type} />
                      </div>
                    ) : items.length ? (
                      renderRows(items)
                    ) : (
                      <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                        No advertisement in this slot.
                      </p>
                    )}
                    {items.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        There are multiple entries for this slot. Only the first
                        enabled one is shown; delete extra entries to keep the
                        CMS unambiguous.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) clearPreview();
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit ${TYPE_LABEL[form.type].toLowerCase()}`
                : `Add ${TYPE_LABEL[form.type].toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              Upload or replace the image. Titles and descriptions are not
              displayed on the homepage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Image</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Recommended image dimensions"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {IMAGE_DIMENSIONS[form.type]}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div
                className={`relative w-full overflow-hidden rounded-lg border bg-muted ${
                  form.type === 'hero' ? 'aspect-[1.96/1]' : 'aspect-[5/4]'
                }`}
              >
                {form.image ? (
                  <>
                    <Image
                      src={form.image}
                      alt="Image preview"
                      fill
                      sizes="(max-width: 640px) 100vw, 576px"
                      className={
                        form.type === 'hero' ? 'object-cover' : 'object-contain'
                      }
                      unoptimized={form.image.startsWith('blob:')}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-2"
                      aria-label="Remove image"
                      onClick={() => {
                        clearPreview();
                        setForm((current) => ({
                          ...current,
                          image: '',
                          active: false,
                        }));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm">No image selected</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(event) => {
                  selectImage(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />{' '}
                {form.image ? 'Replace image' : 'Upload image'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slider-link">Destination link (optional)</Label>
              <Input
                id="slider-link"
                value={form.link}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    link: event.target.value,
                  }))
                }
                placeholder="/internal-route or https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                Use a site path or an HTTP(S) URL.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(active) =>
                  setForm((current) => ({ ...current, active }))
                }
              />
              <Label>Show on homepage</Label>
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
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This image will be removed from the homepage. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removePromotion()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
