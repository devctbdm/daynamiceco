'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { homeSliderTextApi, homeSliderSettingApi, type HomeSliderText } from '@/lib/api';

const emptyForm = {
  text: '',
  active: true,
  sortOrder: 0,
};

export default function HomeSliderTextPage() {
  const [texts, setTexts] = useState<HomeSliderText[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HomeSliderText | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomeSliderText | null>(null);
  const [settingEnabled, setSettingEnabled] = useState(true);
  const [settingSaving, setSettingSaving] = useState(false);

  const fetchTexts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await homeSliderTextApi.getAll();
      if (data.success) setTexts(data.texts || []);
    } catch {
      toast.error('Failed to load home slide texts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSetting = useCallback(async () => {
    try {
      const { data } = await homeSliderSettingApi.get();
      if (data.success) setSettingEnabled(data.setting.enabled !== false);
    } catch {
      /* keep the default (enabled) if the request fails */
    }
  }, []);

  useEffect(() => {
    fetchTexts();
    fetchSetting();
  }, [fetchTexts, fetchSetting]);

  const toggleSetting = async (next: boolean) => {
    const previous = settingEnabled;
    setSettingEnabled(next);
    try {
      setSettingSaving(true);
      const { data } = await homeSliderSettingApi.update({ enabled: next });
      if (data.success) setSettingEnabled(data.setting.enabled);
      toast.success(
        next
          ? 'Marquee is now shown on the homepage'
          : 'Marquee is now hidden from the homepage'
      );
    } catch (err: any) {
      setSettingEnabled(previous);
      toast.error(
        err?.response?.data?.message || 'Failed to update visibility'
      );
    } finally {
      setSettingSaving(false);
    }
  };

  const sorted = [...texts].sort((a, b) => a.sortOrder - b.sortOrder);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      sortOrder: sorted.length
        ? Math.max(...sorted.map((s) => s.sortOrder)) + 1
        : 1,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: HomeSliderText) => {
    setEditing(s);
    setForm({ text: s.text, active: s.active, sortOrder: s.sortOrder });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.text.trim()) {
      toast.error('Please enter the notification text');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form, sortOrder: Number(form.sortOrder) || 0 };
      if (editing) {
        await homeSliderTextApi.update(editing._id, payload);
        toast.success('Text updated');
      } else {
        await homeSliderTextApi.create(payload);
        toast.success('Text created');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchTexts();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to save text'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: HomeSliderText) => {
    try {
      await homeSliderTextApi.update(s._id, { active: !s.active });
      toast.success(`Text ${s.active ? 'hidden' : 'activated'}`);
      fetchTexts();
    } catch {
      toast.error('Failed to update text');
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const swap = sorted[idx + dir];
    if (!swap) return;
    try {
      await homeSliderTextApi.reorder([
        { id: sorted[idx]._id, sortOrder: swap.sortOrder },
        { id: swap._id, sortOrder: sorted[idx].sortOrder },
      ]);
      fetchTexts();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await homeSliderTextApi.delete(deleteTarget._id);
      toast.success('Text deleted');
      setDeleteTarget(null);
      fetchTexts();
    } catch {
      toast.error('Failed to delete text');
    }
  };

  return (
    <div>
      <SiteHeader
        title="Home Slide Text"
        description="Manage the scrolling notification texts shown on the homepage marquee."
      />

      <div className="px-4 py-8">
        {/* Master visibility switch for the homepage marquee */}
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Show on homepage</p>
                <p className="text-sm text-muted-foreground">
                  Turn off to hide the announcement marquee from the storefront
                  entirely.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:pl-4">
              <span className="text-sm text-muted-foreground">
                {settingEnabled ? 'Visible' : 'Hidden'}
              </span>
              <Switch
                aria-label="Show home slide text on the homepage"
                checked={settingEnabled}
                disabled={settingSaving}
                onCheckedChange={toggleSetting}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            These messages scroll across the top of the storefront.
          </p>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add text
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading texts…
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No texts yet. Click &quot;Add text&quot; to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s, idx) => (
              <Card key={s._id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {s.text || 'Untitled text'}
                      </p>
                      <Badge
                        variant={s.active ? 'secondary' : 'destructive'}
                      >
                        {s.active ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Show:
                      </span>
                      <Switch
                        checked={s.active}
                        onCheckedChange={() => toggleActive(s)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:flex-col">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={idx === sorted.length - 1}
                      onClick={() => move(idx, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit text' : 'New text'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the notification message.'
                : 'Add a new scrolling notification message.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="text-content">Message</Label>
              <Textarea
                id="text-content"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                placeholder="e.g. 20% off on all MacBooks this week"
                rows={3}
                maxLength={200}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="text-order">Sort order</Label>
              <Input
                id="text-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))}
              />
              <span className="text-sm text-muted-foreground">
                Show this text on the homepage
              </span>
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
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create text'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this text?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.text || 'This text'} will be permanently removed
              from the homepage marquee. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep text</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete text
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
