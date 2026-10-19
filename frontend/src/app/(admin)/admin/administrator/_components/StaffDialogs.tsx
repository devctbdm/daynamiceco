'use client';

import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ModulePermission, PermissionGroup, StaffMember } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { buildEmptyPermissions, ROLES } from './constants';
import { PermissionMatrix } from './PermissionMatrix';

// ── Validation schemas ─────────────────────────────────────────────────────

const baseSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(80),
  email: z.string().trim().email('Valid email required').max(255),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(['super_admin', 'admin', 'manager']),
});

const createSchema = baseSchema.extend({
  password: z.string().min(8, 'At least 8 characters').max(72),
});

// ── Form state types ───────────────────────────────────────────────────────

type PermissionMode = 'role_default' | 'group' | 'custom';

export interface StaffFormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'super_admin' | 'admin' | 'manager';
  active: boolean;
  permissionMode: PermissionMode;
  permissionGroupId: string | null;
  customPermissions: ModulePermission[];
}

export const emptyStaffForm: StaffFormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'manager',
  active: true,
  permissionMode: 'role_default',
  permissionGroupId: null,
  customPermissions: buildEmptyPermissions(),
};

// ── Shared inner form ──────────────────────────────────────────────────────

function StaffForm({
  form,
  setForm,
  errors,
  isCreate,
  permissionGroups,
}: {
  form: StaffFormState;
  setForm: React.Dispatch<React.SetStateAction<StaffFormState>>;
  errors: Record<string, string>;
  isCreate: boolean;
  permissionGroups: PermissionGroup[];
}) {
  const [showPassword, setShowPassword] = useState(false);

  const field = (key: keyof StaffFormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Tabs defaultValue="details" className="flex w-full flex-col">
      <TabsList className="mb-4 grid w-full grid-cols-2 shrink-0">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
      </TabsList>

      {/* ─── Details tab ────────────────────────────────────────────── */}
      <TabsContent value="details" className="mt-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sf-name">Full name *</Label>
            <Input
              id="sf-name"
              value={form.name}
              maxLength={80}
              onChange={(e) => field('name', e.target.value)}
              placeholder="Jane Smith"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-email">Email *</Label>
            <Input
              id="sf-email"
              type="email"
              value={form.email}
              maxLength={255}
              onChange={(e) => field('email', e.target.value)}
              placeholder="jane@example.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sf-phone">Phone</Label>
            <Input
              id="sf-phone"
              type="tel"
              value={form.phone}
              maxLength={20}
              onChange={(e) => field('phone', e.target.value)}
              placeholder="+880 1xxx-xxxxxx"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-role">Role *</Label>
            <Select value={form.role} onValueChange={(v) => v && field('role', v)}>
              <SelectTrigger id="sf-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ROLES.find((r) => r.value === form.role)?.hint}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sf-password">
            Password{' '}
            {!isCreate && (
              <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>
            )}
            {isCreate && ' *'}
          </Label>
          <div className="relative">
            <Input
              id="sf-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              maxLength={72}
              onChange={(e) => field('password', e.target.value)}
              placeholder="Minimum 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Account active</p>
            <p className="text-xs text-muted-foreground">Inactive users cannot sign in</p>
          </div>
          <Switch
            checked={form.active}
            onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
          />
        </div>
      </TabsContent>

      {/* ─── Permissions tab ────────────────────────────────────────── */}
      <TabsContent value="permissions" className="mt-0 space-y-4">
        {form.role === 'super_admin' ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
            Super admins always have full access to all modules. Permission settings are not
            applicable.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Permission source</Label>
              <Select
                value={form.permissionMode}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, permissionMode: v as PermissionMode }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role_default">Use role defaults</SelectItem>
                  {permissionGroups.length > 0 && (
                    <SelectItem value="group">Use permission group</SelectItem>
                  )}
                  <SelectItem value="custom">Custom permissions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.permissionMode === 'group' && (
              <div className="space-y-1.5">
                <Label>Permission group</Label>
                <Select
                  value={form.permissionGroupId ?? ''}
                  onValueChange={(v) =>
                    setForm((f): StaffFormState => ({ ...f, permissionGroupId: v || null }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group…" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionGroups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: g.color }}
                          />
                          {g.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.permissionGroupId && (
                  <p className="text-xs text-destructive">{errors.permissionGroupId}</p>
                )}
              </div>
            )}

            {form.permissionMode === 'custom' && (
              <PermissionMatrix
                permissions={form.customPermissions}
                onChange={(p) => setForm((f) => ({ ...f, customPermissions: p }))}
              />
            )}

            {form.permissionMode === 'role_default' && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                This staff member will use the standard permissions for the{' '}
                <strong>{form.role}</strong> role. You can customise later.
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ── Dialog shell — handles its own scroll so header/footer stay visible ─────

function StaffDialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * Desktop: wide dialog (up to 56rem) with a fixed viewport height cap.
       * The content area is flex-col so the header/footer are sticky and only
       * the form body scrolls — no more outer scrollbar on the whole dialog.
       * Mobile: full-screen sheet style, scrolls naturally.
       */}
      <DialogContent
        className={[
          // Sizing — the sm:/lg: prefixes are required so this max-width
          // overrides the base DialogContent's `sm:max-w-sm` (otherwise the
          // dialog is capped at 24rem on desktop and the permission matrix
          // has to scroll horizontally).
          'w-full sm:max-w-[calc(100%-2rem)] lg:max-w-[56rem]',
          // On desktop: cap height and use flex so body scrolls independently
          'sm:max-h-[92vh]',
          // Flex layout — children must include a scrollable middle section
          'flex flex-col',
          // Remove the default padding so we can control it per-section
          'p-0 gap-0',
          // Prevent the default overflow-auto on the whole dialog
          'overflow-hidden',
        ].join(' ')}
      >
        {/* Sticky header */}
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription className="text-sm">{description}</DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t bg-muted/30 px-6 py-3">
          <DialogFooter className="gap-2">{footer}</DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Dialog ──────────────────────────────────────────────────────────

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  permissionGroups: PermissionGroup[];
  onSubmit: (form: StaffFormState) => Promise<void>;
}

export function CreateStaffDialog({
  open,
  onOpenChange,
  permissionGroups,
  onSubmit,
}: CreateStaffDialogProps) {
  const [form, setForm] = useState<StaffFormState>(emptyStaffForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyStaffForm);
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const result = createSchema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return false;
    }
    if (form.permissionMode === 'group' && !form.permissionGroupId) {
      setErrors({ permissionGroupId: 'Select a permission group' });
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
    <StaffDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add staff member"
      description="Create a new admin account and configure their role and permissions."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create staff member'}
          </Button>
        </>
      }
    >
      <StaffForm
        form={form}
        setForm={setForm}
        errors={errors}
        isCreate
        permissionGroups={permissionGroups}
      />
    </StaffDialogShell>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────────────

interface EditStaffDialogProps {
  member: StaffMember | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  permissionGroups: PermissionGroup[];
  onSubmit: (form: StaffFormState) => Promise<void>;
}

export function EditStaffDialog({
  member,
  open,
  onOpenChange,
  permissionGroups,
  onSubmit,
}: EditStaffDialogProps) {
  const [form, setForm] = useState<StaffFormState>(emptyStaffForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !member) return;

    let permissionMode: PermissionMode = 'role_default';
    if (member.customPermissions?.length) permissionMode = 'custom';
    else if (member.permissionGroup) permissionMode = 'group';

    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone ?? '',
      password: '',
      role: member.role,
      active: member.active,
      permissionMode,
      permissionGroupId: member.permissionGroup?._id ?? null,
      customPermissions: member.customPermissions?.length
        ? member.customPermissions
        : buildEmptyPermissions(),
    });
    setErrors({});
  }, [open, member]);

  const validate = () => {
    const schema = form.password ? createSchema : baseSchema;
    const result = schema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return false;
    }
    if (form.permissionMode === 'group' && !form.permissionGroupId) {
      setErrors({ permissionGroupId: 'Select a permission group' });
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
    <StaffDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${member?.name ?? 'staff member'}`}
      description="Update details, role, or permissions. Role changes take effect immediately."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <StaffForm
        form={form}
        setForm={setForm}
        errors={errors}
        isCreate={false}
        permissionGroups={permissionGroups}
      />
    </StaffDialogShell>
  );
}
