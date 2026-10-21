'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { serviceFinderApi, type ServiceFinderItem } from '@/lib/api';
import { revalidateStorefront } from '@/lib/revalidate';
import {
  DEFAULT_SERVICE_ICON,
  SERVICE_ICON_OPTIONS,
  serviceIcon,
} from '@/lib/serviceIcons';

type Form = {
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  active: boolean;
};

const EMPTY_FORM: Form = {
  title: '',
  subtitle: '',
  icon: SERVICE_ICON_OPTIONS[0].key,
  href: '',
  active: true,
};

/** Swatch used by both the picker and the card icon (matches the storefront). */
const ICON_CHIP =
  'flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-sm';

function ServiceCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
          <Skeleton className="h-5 w-32 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceCard({
  item,
  index,
  count,
  busy,
  onToggle,
  onMove,
  onEdit,
  onDelete,
}: {
  item: ServiceFinderItem;
  index: number;
  count: number;
  busy: boolean;
  onToggle: (item: ServiceFinderItem, active: boolean) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (item: ServiceFinderItem) => void;
  onDelete: (item: ServiceFinderItem) => void;
}) {
  const Icon = serviceIcon(item.icon);
  const switchId = `service-active-${item._id}`;

  return (
    <Card className="h-full" data-inactive={!item.active || undefined}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <span className={ICON_CHIP} aria-hidden="true">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold" title={item.title}>
                {item.title}
              </h3>
              {!item.active && (
                <Badge variant="secondary" className="shrink-0">
                  <EyeOff className="mr-1 size-3" aria-hidden="true" />
                  Hidden
                </Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {item.subtitle || 'No subtitle yet.'}
            </p>
            {item.href && (
              <p
                className="mt-1 truncate text-xs text-muted-foreground"
                title={item.href}
              >
                {item.href}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <Switch
              id={switchId}
              checked={item.active}
              disabled={busy}
              // Base UI puts the `id` on its hidden input, so the visible
              // switch gets its accessible name from this explicit label.
              aria-label={
                item.active
                  ? `Hide ${item.title} from the homepage`
                  : `Show ${item.title} on the homepage`
              }
              onCheckedChange={(checked) => onToggle(item, checked)}
            />
            <Label htmlFor={switchId} className="text-xs text-muted-foreground">
              {item.active ? 'Shown on homepage' : 'Hidden from homepage'}
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${item.title} up`}
              disabled={busy || index === 0}
              onClick={() => onMove(index, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${item.title} down`}
              disabled={busy || index === count - 1}
              onClick={() => onMove(index, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Edit ${item.title}`}
              disabled={busy}
              onClick={() => onEdit(item)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label={`Delete ${item.title}`}
              disabled={busy}
              onClick={() => onDelete(item)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServiceFinderPage() {
  const [items, setItems] = useState<ServiceFinderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ServiceFinderItem | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ServiceFinderItem | null>(
    null
  );
  // null until the section setting has loaded (the switch shows a skeleton).
  const [sectionEnabled, setSectionEnabled] = useState<boolean | null>(null);
  const [settingSaving, setSettingSaving] = useState(false);

  // Mirrors `items` so event handlers always work from the freshest list even
  // when a click lands before React has committed the previous update.
  const itemsRef = useRef<ServiceFinderItem[]>([]);
  const orderingRef = useRef(false);

  /**
   * Runs a write and then purges the cached storefront data, so the homepage
   * picks the change up straight away instead of after its 60s window.
   *
   * The purge is awaited on purpose: the UI only reports success once the cache
   * is fresh, so reloading the homepage straight away can never show stale
   * content. It never throws (best effort — the timed revalidation still runs).
   */
  const runMutation = useCallback(async <T,>(action: () => Promise<T>) => {
    const result = await action();
    await revalidateStorefront();
    return result;
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [itemsResponse, settingResponse] = await Promise.all([
        serviceFinderApi.getAll(),
        serviceFinderApi.getSetting(),
      ]);
      setItems(itemsResponse.data.items ?? []);
      setSectionEnabled(settingResponse.data.setting?.enabled !== false);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Failed to load the service finder cards.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const hiddenCount = useMemo(
    () => items.filter((item) => !item.active).length,
    [items]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, icon: SERVICE_ICON_OPTIONS[0].key });
    setDialogOpen(true);
  }

  function openEdit(item: ServiceFinderItem) {
    setEditing(item);
    setForm({
      title: item.title,
      subtitle: item.subtitle,
      icon: item.icon,
      href: item.href,
      active: item.active,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      toast.error('A title is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        subtitle: form.subtitle.trim(),
        icon: form.icon,
        href: form.href.trim(),
        active: form.active,
      };

      const { data } = await runMutation(() =>
        editing
          ? serviceFinderApi.update(editing._id, payload)
          : serviceFinderApi.create({
              ...payload,
              // New cards are appended at the end of the list.
              sortOrder: items.length,
            })
      );

      setItems((current) => {
        if (!editing) return [...current, data.item];
        return current.map((item) =>
          item._id === data.item._id ? data.item : item
        );
      });
      toast.success(
        editing ? 'Service finder card updated.' : 'Service finder card added.'
      );
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save the service finder card.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: ServiceFinderItem, active: boolean) {
    setBusyId(item._id);
    // Optimistic: the switch flips immediately and reverts if the API fails.
    setItems((current) =>
      current.map((entry) =>
        entry._id === item._id ? { ...entry, active } : entry
      )
    );
    try {
      const { data } = await runMutation(() =>
        serviceFinderApi.update(item._id, { active })
      );
      setItems((current) =>
        current.map((entry) =>
          entry._id === data.item._id ? data.item : entry
        )
      );
      toast.success(
        active
          ? `“${data.item.title}” is now shown on the homepage.`
          : `“${data.item.title}” is hidden from the homepage.`
      );
    } catch (error) {
      setItems((current) =>
        current.map((entry) =>
          entry._id === item._id ? { ...entry, active: item.active } : entry
        )
      );
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the visibility.'
      );
    } finally {
      setBusyId(null);
    }
  }

  /** Section-level switch: hides/shows every card at once on the homepage. */
  async function toggleSection(enabled: boolean) {
    const previous = sectionEnabled;
    setSectionEnabled(enabled); // optimistic — reverted if the API fails
    setSettingSaving(true);
    try {
      const { data } = await runMutation(() =>
        serviceFinderApi.updateSetting({ enabled })
      );
      setSectionEnabled(data.setting?.enabled !== false);
      toast.success(
        enabled
          ? 'The service finder section is now shown on the homepage.'
          : 'The service finder section is hidden from the homepage.'
      );
    } catch (error) {
      setSectionEnabled(previous);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update the section visibility.'
      );
    } finally {
      setSettingSaving(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    // Guard against a second click landing before React commits the disabled
    // state, which would reorder the list twice from stale data.
    if (orderingRef.current) return;

    const current = itemsRef.current;
    const target = index + direction;
    if (target < 0 || target >= current.length) return;

    const reordered = [...current];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    const normalised = reordered.map((item, position) => ({
      ...item,
      sortOrder: position,
    }));

    orderingRef.current = true;
    itemsRef.current = normalised;
    setItems(normalised);
    setOrdering(true);
    try {
      await runMutation(() =>
        serviceFinderApi.reorder(
          normalised.map((item) => ({
            id: item._id,
            sortOrder: item.sortOrder,
          }))
        )
      );
    } catch (error) {
      itemsRef.current = current;
      setItems(current);
      toast.error(
        error instanceof Error ? error.message : 'Failed to reorder the cards.'
      );
    } finally {
      orderingRef.current = false;
      setOrdering(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget._id);
    try {
      await runMutation(() => serviceFinderApi.delete(deleteTarget._id));
      setItems((current) =>
        current.filter((item) => item._id !== deleteTarget._id)
      );
      toast.success('Service finder card deleted.');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete the service finder card.'
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SiteHeader />
      <div className="space-y-6 px-4 py-8 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Service finder</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The helper cards under the homepage slider — each one is an icon,
              a title and a short subtitle. Hidden cards stay in this list and
              disappear from the storefront.
            </p>
          </div>
          <Button onClick={openCreate} disabled={loading || ordering}>
            <Plus className="mr-1 size-4" /> Add card
          </Button>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{loadError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchItems()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <CardTitle>Homepage cards</CardTitle>
              <CardDescription>
                {loading
                  ? 'Loading service finder cards…'
                  : `${items.length} card${items.length === 1 ? '' : 's'} · ${
                      items.length - hiddenCount
                    } shown on the homepage${
                      hiddenCount ? ` · ${hiddenCount} hidden` : ''
                    }`}
              </CardDescription>
            </div>

            {/* Section-level switch: one toggle for the whole homepage block. */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Label
                  htmlFor="service-section-enabled"
                  className="text-sm font-medium"
                >
                  Show section
                </Label>
                {loading || sectionEnabled === null ? (
                  <Skeleton className="mt-1 ml-auto h-3 w-28 rounded-full" />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {sectionEnabled
                      ? 'Visible on the homepage'
                      : 'Hidden from the homepage'}
                  </p>
                )}
              </div>
              {loading || sectionEnabled === null ? (
                <Skeleton className="h-5 w-9 rounded-full" />
              ) : (
                <Switch
                  id="service-section-enabled"
                  checked={sectionEnabled}
                  disabled={settingSaving}
                  aria-label={
                    sectionEnabled
                      ? 'Hide the service finder section from the homepage'
                      : 'Show the service finder section on the homepage'
                  }
                  onCheckedChange={(enabled) => void toggleSection(enabled)}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!loading && sectionEnabled === false && (
              <p className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <EyeOff
                  className="mt-px size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  The whole section is hidden from the homepage. Shoppers see
                  nothing here until you switch “Show section” back on — the
                  cards below keep their own individual switches.
                </span>
              </p>
            )}
            {loading ? (
              <div
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                aria-busy="true"
              >
                <span className="sr-only" role="status">
                  Loading service finder cards…
                </span>
                {[0, 1, 2].map((key) => (
                  <ServiceCardSkeleton key={key} />
                ))}
              </div>
            ) : items.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item, index) => (
                  <ServiceCard
                    key={item._id}
                    item={item}
                    index={index}
                    count={items.length}
                    busy={busyId === item._id || ordering}
                    onToggle={toggleActive}
                    onMove={move}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-14 text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                  aria-hidden="true"
                >
                  <Layers className="size-6" />
                </span>
                <div>
                  <p className="font-medium">No service finder cards yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your first card to show it on the homepage.
                  </p>
                </div>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-1 size-4" /> Add card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? 'Edit service finder card'
                  : 'New service finder card'}
              </DialogTitle>
              <DialogDescription>
                Pick an icon and add a short title with a one-line subtitle.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="service-title">Title</Label>
                <Input
                  id="service-title"
                  value={form.title}
                  maxLength={80}
                  placeholder="Laptop Finder"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-subtitle">Subtitle</Label>
                <Input
                  id="service-subtitle"
                  value={form.subtitle}
                  maxLength={160}
                  placeholder="Find the perfect laptop for your needs"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subtitle: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Icon</Label>
                <div
                  className="grid grid-cols-6 gap-2 sm:grid-cols-9"
                  role="radiogroup"
                  aria-label="Card icon"
                >
                  {SERVICE_ICON_OPTIONS.map(({ key, label, Icon }) => {
                    const selected = form.icon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={label}
                        title={label}
                        onClick={() =>
                          setForm((current) => ({ ...current, icon: key }))
                        }
                        className={`flex size-9 items-center justify-center rounded-md border transition-colors ${
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {SERVICE_ICON_OPTIONS.find(
                    (option) => option.key === form.icon
                  )?.label ?? 'General'}{' '}
                  icon selected.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-href">
                  Link <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="service-href"
                  value={form.href}
                  maxLength={300}
                  placeholder="/pc-builders"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      href: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to make the card non-clickable.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <Label htmlFor="service-active">Show on homepage</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn off to keep the card here but hide it from shoppers.
                  </p>
                </div>
                <Switch
                  id="service-active"
                  checked={form.active}
                  aria-label="Show on homepage"
                  onCheckedChange={(active) =>
                    setForm((current) => ({ ...current, active }))
                  }
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <span className={ICON_CHIP} aria-hidden="true">
                  {(() => {
                    const Preview = form.icon
                      ? serviceIcon(form.icon)
                      : DEFAULT_SERVICE_ICON;
                    return <Preview className="size-6" />;
                  })()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {form.title.trim() || 'Card title'}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {form.subtitle.trim() || 'Card subtitle'}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
                {editing ? 'Save changes' : 'Add card'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be removed from the homepage and from
              this list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
