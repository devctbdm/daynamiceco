'use client';

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
import { Textarea } from '@/components/ui/textarea';
import type { ModulePermission, PermissionGroup } from '@/lib/api';
import { Layers, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildEmptyPermissions } from './constants';
import { PermissionMatrix } from './PermissionMatrix';

// ── Group form state ──────────────────────────────────────────────────────

interface GroupFormState {
  name: string;
  description: string;
  color: string;
  permissions: ModulePermission[];
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

const emptyGroup = (): GroupFormState => ({
  name: '',
  description: '',
  color: '#6366f1',
  permissions: buildEmptyPermissions(),
});

// ── Group form dialog ─────────────────────────────────────────────────────

function GroupDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: PermissionGroup | null;
  onSubmit: (form: GroupFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<GroupFormState>(emptyGroup());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description,
        color: editing.color,
        permissions: editing.permissions?.length ? editing.permissions : buildEmptyPermissions(),
      });
    } else {
      setForm(emptyGroup());
    }
    setErrors({});
  }, [open, editing]);

  const validate = () => {
    if (!form.name.trim()) {
      setErrors({ name: 'Name is required' });
      return false;
    }
    if (form.name.trim().length > 80) {
      setErrors({ name: 'Name cannot exceed 80 characters' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * Same fixed-height, sticky-header/footer pattern as StaffDialogs.
       * The permission matrix sits in the scrollable body so it never forces
       * the whole dialog to grow taller than the viewport.
       * The sm:/lg: prefixes override the base dialog's `sm:max-w-sm` so the
       * dialog widens on desktop for the permission matrix.
       */}
      <DialogContent
        className="flex w-full sm:max-w-[calc(100%-2rem)] lg:max-w-[60rem] flex-col gap-0 overflow-hidden p-0 sm:max-h-[92vh]"
      >
        {/* Sticky header */}
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editing ? `Edit "${editing.name}"` : 'New permission group'}
            </DialogTitle>
            <DialogDescription>
              Define a reusable permission template that can be assigned to multiple staff members.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pg-name">Group name *</Label>
              <Input
                id="pg-name"
                value={form.name}
                maxLength={80}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Content Editor"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="h-6 w-6 rounded-full ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    style={{
                      background: c,
                      outline: form.color === c ? `3px solid ${c}` : undefined,
                      outlineOffset: form.color === c ? '2px' : undefined,
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pg-desc">Description</Label>
            <Textarea
              id="pg-desc"
              value={form.description}
              maxLength={300}
              rows={2}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this group allows…"
            />
          </div>

          <div className="space-y-2">
            <Label>Module permissions</Label>
            <PermissionMatrix
              permissions={form.permissions}
              onChange={(p) => setForm((f) => ({ ...f, permissions: p }))}
            />
          </div>
        </div>
        </div>{/* end scrollable body */}

        {/* Sticky footer */}
        <div className="shrink-0 border-t bg-muted/30 px-6 py-3">
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create group'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Group card ────────────────────────────────────────────────────────────

function GroupCard({
  group,
  onEdit,
  onDelete,
}: {
  group: PermissionGroup;
  onEdit: (g: PermissionGroup) => void;
  onDelete: (g: PermissionGroup) => void;
}) {
  const grantedModules = (group.permissions ?? []).filter((p) =>
    Object.entries(p)
      .filter(([k]) => k !== 'module')
      .some(([, v]) => v)
  ).length;

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ background: group.color }} />
      <CardHeader className="pb-2 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base">{group.name}</CardTitle>
            {group.description && (
              <CardDescription className="text-xs leading-tight">
                {group.description}
              </CardDescription>
            )}
          </div>
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(group)}
              aria-label="Edit group"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(group)}
              aria-label="Delete group"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-5 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {grantedModules} module{grantedModules !== 1 ? 's' : ''} granted
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {group.usageCount ?? 0} staff member{(group.usageCount ?? 0) !== 1 ? 's' : ''}
          </span>
          <Badge variant={group.active ? 'secondary' : 'outline'} className="text-[10px]">
            {group.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export interface PermissionGroupsTabProps {
  groups: PermissionGroup[];
  loading: boolean;
  onCreate: (form: GroupFormState) => Promise<void>;
  onUpdate: (id: string, form: GroupFormState) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PermissionGroupsTab({
  groups,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: PermissionGroupsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionGroup | null>(null);

  const handleDialogSubmit = async (form: GroupFormState) => {
    if (editingGroup) {
      await onUpdate(editingGroup._id, form);
    } else {
      await onCreate(form);
    }
    setDialogOpen(false);
    setEditingGroup(null);
  };

  const openCreate = () => {
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const openEdit = (g: PermissionGroup) => {
    setEditingGroup(g);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget._id);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Permission groups</h2>
            <p className="text-sm text-muted-foreground">
              Reusable templates you can assign to multiple staff members.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New group
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <Layers className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-medium">No permission groups yet</p>
                <p className="text-sm text-muted-foreground">
                  Create groups to quickly assign the same permissions to multiple staff members.
                </p>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create first group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g._id} group={g} onEdit={openEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingGroup}
        onSubmit={handleDialogSubmit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(deleteTarget?.usageCount ?? 0) > 0 ? (
                <>
                  <strong>{deleteTarget?.usageCount}</strong> staff member
                  {(deleteTarget?.usageCount ?? 0) !== 1 ? 's' : ''} use this group. They will
                  revert to their role&apos;s default permissions.
                </>
              ) : (
                'This group is not currently assigned to any staff members.'
              )}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
