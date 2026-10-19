'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  CalendarOff,
  Clock,
  ExternalLink,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/RichTextEditor';
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
import { SiteHeader } from '@/components/site-header';
import {
  physicalStoreApi,
  physicalStoreSettingApi,
  type PhysicalStore,
  type PhysicalStoreForm,
  type PhysicalStoreSetting,
} from '@/lib/api';

type SettingForm = {
  enabled: boolean;
  title: string;
  subtitle: string;
  description: string;
  buttonLabel: string;
  buttonLink: string;
  showCount: boolean;
  countSuffix: string;
  bannerUrl: string;
};

const emptyForm: PhysicalStoreForm = {
  title: '',
  address: '',
  description: '',
  phones: [],
  openTime: '',
  closeTime: '',
  offDay: '',
  mapUrl: '',
  active: true,
  sortOrder: 0,
};

const emptySetting: SettingForm = {
  enabled: true,
  title: 'Physical Stores',
  subtitle: '',
  description: '',
  buttonLabel: 'Find Our Stores',
  buttonLink: '/physical-stores',
  showCount: true,
  countSuffix: '+',
  bannerUrl: '',
};

export default function PhysicalStoresAdminPage() {
  const [stores, setStores] = useState<PhysicalStore[]>([]);
  const [loading, setLoading] = useState(true);

  const [settingForm, setSettingForm] = useState<SettingForm>(emptySetting);
  const [settingSaving, setSettingSaving] = useState(false);
  const [bannerPreview, setBannerPreview] = useState('');
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileRef = useRef<File | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PhysicalStore | null>(null);
  const [form, setForm] = useState<PhysicalStoreForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PhysicalStore | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStores = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await physicalStoreApi.getAll();
      setStores(data.stores || []);
    } catch {
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSetting = useCallback(async () => {
    try {
      const { data } = await physicalStoreSettingApi.get();
      if (data.success) {
        const s: PhysicalStoreSetting = data.setting;
        setSettingForm({
          enabled: s.enabled,
          title: s.title,
          subtitle: s.subtitle,
          description: s.description,
          buttonLabel: s.buttonLabel,
          buttonLink: s.buttonLink,
          showCount: s.showCount,
          countSuffix: s.countSuffix,
          bannerUrl: s.bannerUrl,
        });
        setBannerPreview(s.bannerUrl || '');
        bannerFileRef.current = null;
      }
    } catch {
      toast.error('Failed to load banner settings');
    }
  }, []);

  useEffect(() => {
    loadStores();
    loadSetting();
  }, [loadStores, loadSetting]);

  const activeCount = stores.filter((s) => s.active).length;
  const previewHeading = settingForm.showCount
    ? `${activeCount}${settingForm.countSuffix || ''} ${
        settingForm.title || 'Physical Stores'
      }`
    : settingForm.title || 'Physical Stores';

  // ---- Banner settings ----
  const onBannerPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    bannerFileRef.current = file;
    setBannerPreview(URL.createObjectURL(file));
  };

  const removeBanner = () => {
    bannerFileRef.current = null;
    setBannerPreview('');
    setSettingForm((f) => ({ ...f, bannerUrl: '' }));
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const saveSetting = async () => {
    try {
      setSettingSaving(true);
      const { data } = await physicalStoreSettingApi.update(
        { ...settingForm },
        bannerFileRef.current
      );
      if (data.success) {
        setSettingForm((f) => ({ ...f, bannerUrl: data.setting.bannerUrl }));
        setBannerPreview(data.setting.bannerUrl || '');
        bannerFileRef.current = null;
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        toast.success('Banner settings saved');
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save banner settings';
      toast.error(message);
    } finally {
      setSettingSaving(false);
    }
  };

  // ---- Store CRUD ----
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sortOrder: stores.length });
    setDialogOpen(true);
  };

  const openEdit = (store: PhysicalStore) => {
    setEditing(store);
    setForm({
      title: store.title,
      address: store.address,
      description: store.description,
      phones: (store.phones || []).map((p) => ({
        label: p.label,
        number: p.number,
      })),
      openTime: store.openTime,
      closeTime: store.closeTime,
      offDay: store.offDay,
      mapUrl: store.mapUrl,
      active: store.active,
      sortOrder: store.sortOrder,
    });
    setDialogOpen(true);
  };

  const addPhone = () =>
    setForm((f) => ({ ...f, phones: [...f.phones, { label: '', number: '' }] }));

  const updatePhone = (index: number, key: 'label' | 'number', value: string) =>
    setForm((f) => ({
      ...f,
      phones: f.phones.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
    }));

  const removePhone = (index: number) =>
    setForm((f) => ({ ...f, phones: f.phones.filter((_, i) => i !== index) }));

  const saveStore = async () => {
    if (!form.title.trim()) {
      toast.error('Store title is required');
      return;
    }
    try {
      setSaving(true);
      const payload: PhysicalStoreForm = {
        ...form,
        phones: form.phones.filter((p) => p.label.trim() || p.number.trim()),
      };
      if (editing) {
        const { data } = await physicalStoreApi.update(editing._id, payload);
        if (data.success) {
          toast.success('Store updated');
          setDialogOpen(false);
          loadStores();
        }
      } else {
        const { data } = await physicalStoreApi.create(payload);
        if (data.success) {
          toast.success('Store added');
          setDialogOpen(false);
          loadStores();
          loadSetting();
        }
      }
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save store';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (store: PhysicalStore, active: boolean) => {
    setStores((prev) =>
      prev.map((s) => (s._id === store._id ? { ...s, active } : s))
    );
    try {
      await physicalStoreApi.update(store._id, { active });
      loadSetting();
    } catch {
      setStores((prev) =>
        prev.map((s) => (s._id === store._id ? { ...s, active: !active } : s))
      );
      toast.error('Failed to update store');
    }
  };

  const move = async (store: PhysicalStore, direction: -1 | 1) => {
    const index = stores.findIndex((s) => s._id === store._id);
    const target = index + direction;
    if (target < 0 || target >= stores.length) return;
    const next = [...stores];
    [next[index], next[target]] = [next[target], next[index]];
    setStores(next);
    try {
      await physicalStoreApi.reorder(
        next.map((s, i) => ({ id: s._id, sortOrder: i }))
      );
    } catch {
      toast.error('Failed to reorder stores');
      loadStores();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await physicalStoreApi.delete(deleteTarget._id);
      toast.success('Store deleted');
      setDeleteTarget(null);
      loadStores();
      loadSetting();
    } catch {
      toast.error('Failed to delete store');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Physical Stores</h1>
            <p className="text-sm text-muted-foreground">
              Manage the home page banner and every branch shown on the
              storefront.
            </p>
          </div>
          <Link
            href="/physical-stores"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            View stores page <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* ---------- Banner settings ---- */}
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Home page banner</h2>
                <p className="text-sm text-muted-foreground">
                  Show or hide the physical stores banner on the home page.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="banner-enabled" className="text-sm">
                  {settingForm.enabled ? 'Shown on home' : 'Hidden'}
                </Label>
                <Switch
                  id="banner-enabled"
                  checked={settingForm.enabled}
                  onCheckedChange={(v) =>
                    setSettingForm((f) => ({ ...f, enabled: v }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="banner-title">Title</Label>
                <Input
                  id="banner-title"
                  value={settingForm.title}
                  onChange={(e) =>
                    setSettingForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Physical Stores"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-subtitle">Subtitle</Label>
                <Input
                  id="banner-subtitle"
                  value={settingForm.subtitle}
                  onChange={(e) =>
                    setSettingForm((f) => ({ ...f, subtitle: e.target.value }))
                  }
                  placeholder="Visit Our Store & Get Your Desired IT Product!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-button-label">Button label</Label>
                <Input
                  id="banner-button-label"
                  value={settingForm.buttonLabel}
                  onChange={(e) =>
                    setSettingForm((f) => ({
                      ...f,
                      buttonLabel: e.target.value,
                    }))
                  }
                  placeholder="Find Our Stores"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-button-link">Button link</Label>
                <Input
                  id="banner-button-link"
                  value={settingForm.buttonLink}
                  onChange={(e) =>
                    setSettingForm((f) => ({ ...f, buttonLink: e.target.value }))
                  }
                  placeholder="/physical-stores"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex items-center gap-2 pb-2.5">
                <Switch
                  id="banner-count"
                  checked={settingForm.showCount}
                  onCheckedChange={(v) =>
                    setSettingForm((f) => ({ ...f, showCount: v }))
                  }
                />
                <Label htmlFor="banner-count">Show store count</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-suffix">Count suffix</Label>
                <Input
                  id="banner-suffix"
                  className="w-24"
                  value={settingForm.countSuffix}
                  onChange={(e) =>
                    setSettingForm((f) => ({
                      ...f,
                      countSuffix: e.target.value,
                    }))
                  }
                  placeholder="+"
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Live preview
              </p>
              <p className="mt-1 text-lg font-semibold">{previewHeading}</p>
              {settingForm.subtitle && (
                <p className="text-sm text-muted-foreground">
                  {settingForm.subtitle}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Banner image (optional)</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div
                  className="h-24 w-full max-w-xs rounded-md border bg-muted bg-cover bg-center"
                  style={
                    bannerPreview
                      ? { backgroundImage: `url(${bannerPreview})` }
                      : undefined
                  }
                />
                <div className="flex gap-2">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onBannerPick}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" /> Choose image
                  </Button>
                  {bannerPreview && (
                    <Button type="button" variant="ghost" onClick={removeBanner}>
                      <X className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSetting} disabled={settingSaving}>
                {settingSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save banner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stores */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Branches</h2>
                <p className="text-sm text-muted-foreground">
                  {stores.length} total · {activeCount} active
                </p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add store
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
                stores…
              </div>
            ) : stores.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                No stores yet. Add your first branch.
              </div>
            ) : (
              <div className="space-y-3">
                {stores.map((store, index) => {
                  const phones = (store.phones || []).filter(
                    (p) => p.label || p.number
                  );
                  const hours =
                    store.openTime || store.closeTime
                      ? `${store.openTime || '—'} – ${store.closeTime || '—'}`
                      : '';
                  return (
                    <div
                      key={store._id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold">
                            {store.title}
                          </h3>
                          <Badge
                            variant={store.active ? 'default' : 'secondary'}
                          >
                            {store.active ? 'Active' : 'Hidden'}
                          </Badge>
                        </div>
                        {store.address && (
                          <p className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{store.address}</span>
                          </p>
                        )}
                        {phones.length > 0 && (
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            {phones.map((p, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1"
                              >
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                {p.label && <span>{p.label}:</span>}
                                <span>{p.number}</span>
                              </span>
                            ))}
                          </p>
                        )}
                        {(hours || store.offDay) && (
                          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                            {hours && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {hours}
                              </span>
                            )}
                            {store.offDay && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarOff className="h-3.5 w-3.5" /> Off:{' '}
                                {store.offDay}
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => move(store, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === stores.length - 1}
                          onClick={() => move(store, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={store.active}
                          onCheckedChange={(v) => toggleActive(store, v)}
                          aria-label="Toggle active"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(store)}
                          aria-label="Edit store"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(store)}
                          aria-label="Delete store"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom description (rich text) */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="text-lg font-semibold">Bottom description</h2>
              <p className="text-sm text-muted-foreground">
                Rich text shown under the store list on the stores page (e.g.
                service notes, delivery info, contact details).
              </p>
            </div>

            <RichTextEditor
              value={settingForm.description}
              onChange={(html) =>
                setSettingForm((f) => ({ ...f, description: html }))
              }
            />

            <div className="flex justify-end">
              <Button onClick={saveSetting} disabled={settingSaving}>
                {settingSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save description
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit store' : 'Add store'}</DialogTitle>
            <DialogDescription>
              Branch details shown on the storefront stores page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="store-title">Title</Label>
              <Input
                id="store-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Sylhet Branch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-address">Address</Label>
              <Input
                id="store-address"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Showdagor Tower, 1st Floor, Azadi 54/A, Mirboxtula, Sylhet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-description">Short description</Label>
              <Textarea
                id="store-description"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional short note about this branch"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Phone numbers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhone}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              {form.phones.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  e.g. Desktop: 01335138163 · Laptop: 01335138161
                </p>
              )}
              <div className="space-y-2">
                {form.phones.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      className="w-32"
                      value={phone.label}
                      onChange={(e) =>
                        updatePhone(index, 'label', e.target.value)
                      }
                      placeholder="Desktop"
                    />
                    <Input
                      value={phone.number}
                      onChange={(e) =>
                        updatePhone(index, 'number', e.target.value)
                      }
                      placeholder="01335138163"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhone(index)}
                      aria-label="Remove phone"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="store-open">Opens at</Label>
                <Input
                  id="store-open"
                  value={form.openTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, openTime: e.target.value }))
                  }
                  placeholder="10:00 AM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-close">Closes at</Label>
                <Input
                  id="store-close"
                  value={form.closeTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, closeTime: e.target.value }))
                  }
                  placeholder="8:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-off">Off day</Label>
                <Input
                  id="store-off"
                  value={form.offDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, offDay: e.target.value }))
                  }
                  placeholder="Friday"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-map">Google Maps directions link</Label>
              <Input
                id="store-map"
                value={form.mapUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mapUrl: e.target.value }))
                }
                placeholder="https://maps.google.com/?q=Sylhet"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="store-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Show this branch on the storefront.
                </p>
              </div>
              <Switch
                id="store-active"
                checked={form.active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, active: v }))
                }
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
            <Button onClick={saveStore} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete store?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>{' '}
              from the storefront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
