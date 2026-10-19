'use client';

import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { maintenanceApi, type MaintenanceStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store';
import {
  Clock,
  Construction,
  Eye,
  Power,
  RefreshCw,
  Save,
  ShieldAlert,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toIso(input: string) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Format an ISO timestamp as a friendly local date + time.
function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const DEFAULT_MESSAGE =
  "We're working hard to improve Apple IT Zone and give you a better experience. We'll be back online shortly.";

const DEFAULT_SELLING_MESSAGE =
  "We're updating our store right now. You can browse products, but buying is temporarily disabled. Please check back soon.";

export default function AdminMaintenancePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [endAt, setEndAt] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [sellingEnabled, setSellingEnabled] = useState(true);
  const [sellingMessage, setSellingMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'super_admin') {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, user, router]);

  const load = async () => {
    try {
      const { data } = await maintenanceApi.getStatus();
      const m = data.maintenance;
      setEnabled(m.enabled);
      setMessage(m.message || DEFAULT_MESSAGE);
      setEndAt(toLocalInput(m.endAt));
      setContactEmail(m.contactEmail);
      setContactPhone(m.contactPhone);
      setSellingEnabled(m.sellingEnabled !== false);
      setSellingMessage(m.sellingMessage || '');
      setLastUpdated(m.updatedAt || null);
    } catch {
      toast.error('Could not load maintenance settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSave = async (overrides?: {
    enabled?: boolean;
    sellingEnabled?: boolean;
  }) => {
    setSaving(true);
    try {
      const body: Partial<MaintenanceStatus> = {
        message,
        contactEmail,
        contactPhone,
        endAt: toIso(endAt),
        enabled: overrides?.enabled ?? enabled,
        sellingEnabled: overrides?.sellingEnabled ?? sellingEnabled,
        sellingMessage,
      };

      const { data } = await maintenanceApi.update(body);
      const nextMaint = data.maintenance.enabled;
      const nextSelling = data.maintenance.sellingEnabled !== false;
      setEnabled(nextMaint);
      setSellingEnabled(nextSelling);
      setLastUpdated(data.maintenance.updatedAt || new Date().toISOString());

      if (overrides?.sellingEnabled !== undefined) {
        toast.success(
          nextSelling
            ? 'Buying is back ON'
            : 'Buying is now OFF (browse-only mode)'
        );
      } else {
        toast.success(
          nextMaint
            ? 'Maintenance mode is now ON'
            : 'Maintenance mode is now OFF'
        );
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to save maintenance settings'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex  flex-col gap-4 md:flex-row md:items-center md:justify-between ">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Maintenance Mode
            </h2>
            <p className="text-muted-foreground">
              Temporarily take the store offline for everyone except super
              admins.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-2  text-right sm:block">
              <p className="text-xs text-muted-foreground">Last updated</p>
              <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDateTime(lastUpdated)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reload
            </Button>
            <Link
              href="/maintenance"
              target="_blank"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'inline-flex items-center gap-1.5'
              )}
            >
              <Eye className="h-4 w-4" /> Preview
            </Link>
          </div>
        </div>

        {/* Status banner */}
        <Card
          className={
            enabled
              ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20'
              : ''
          }
        >
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  enabled
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                }`}
              >
                <Construction className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">
                    {enabled ? 'Maintenance mode is ON' : 'Store is live'}
                  </p>
                  <Badge variant={enabled ? 'destructive' : 'secondary'}>
                    {enabled ? 'ACTIVE' : 'OFFLINE'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {enabled
                    ? 'All visitors are seeing the maintenance page. Only super admins can access the store and dashboard.'
                    : 'No one is blocked. The maintenance page is hidden.'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={enabled ? 'destructive' : 'default'}
              onClick={() => handleSave({ enabled: !enabled })}
              disabled={saving}
            >
              <Power className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : enabled ? 'Disable now' : 'Enable now'}
            </Button>
          </CardContent>
        </Card>

        {/* Stop selling / browse-only mode */}
        <Card
          className={
            !sellingEnabled
              ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20'
              : ''
          }
        >
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    !sellingEnabled
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                  }`}
                >
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      Stop Selling (Browse-only mode)
                    </CardTitle>
                    <Badge
                      variant={!sellingEnabled ? 'destructive' : 'secondary'}
                    >
                      {!sellingEnabled ? 'BUYING OFF' : 'BUYING ON'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Keep the store online but stop customers from buying. They
                    can still browse products — a notice appears at the top of
                    every store page.
                  </CardDescription>
                </div>
              </div>
              <Button
                size="sm"
                variant={!sellingEnabled ? 'default' : 'destructive'}
                onClick={() => handleSave({ sellingEnabled: !sellingEnabled })}
                disabled={saving}
              >
                <Power className="h-4 w-4 mr-2" />
                {saving
                  ? 'Saving...'
                  : !sellingEnabled
                    ? 'Resume selling'
                    : 'Stop selling now'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Allow customers to buy</Label>
                <p className="text-sm text-muted-foreground">
                  Turn off to disable add-to-cart, checkout and online payment
                  for customers. Admins, managers and super admins can still
                  place orders.
                </p>
              </div>
              <Switch
                checked={sellingEnabled}
                onCheckedChange={setSellingEnabled}
              />
            </div>

            {!sellingEnabled && (
              <div className="space-y-2">
                <Label htmlFor="sellingMessage">
                  Notice shown to customers
                </Label>
                <Textarea
                  id="sellingMessage"
                  rows={2}
                  value={sellingMessage}
                  onChange={(e) => setSellingMessage(e.target.value)}
                  placeholder={DEFAULT_SELLING_MESSAGE}
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the top banner and at checkout. Leave empty to use
                  the default notice.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button onClick={() => handleSave()} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save selling settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                These are shown on the maintenance page visitors see.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Maintenance mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Block all users except super admins.
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={DEFAULT_MESSAGE}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="endAt">Expected back online</Label>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Shown as a countdown; leave empty to hide it.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+880 1234 567890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="support@appleitzone.com"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => handleSave()} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save settings'}
                </Button>
                {enabled && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEnabled(false);
                      handleSave({ enabled: false });
                    }}
                    disabled={saving}
                  >
                    Turn off &amp; save
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>What happens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p>
                  When enabled, <strong>everyone</strong> except the{' '}
                  <strong>super admin</strong> is redirected to{' '}
                  <code className="rounded bg-muted px-1">/maintenance</code> —
                  including admins, managers and logged-in customers. Super
                  admins keep full access to the store and dashboard so they can
                  turn it off.
                </p>
              </div>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Storefront pages are blocked (home, shop, checkout, login).
                </li>
                <li>Admin panel is blocked for non-super-admin staff.</li>
                <li>Changes apply within ~30 seconds.</li>
                <li>
                  The maintenance page checks status every 10s, so it recovers
                  automatically once you disable the mode.
                </li>
              </ul>

              <div className="flex items-start gap-3 border-t pt-4">
                <ShoppingCart className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p>
                  <strong>Stop selling</strong> is different: the store stays
                  fully visible and browsable, but customers cannot add to cart,
                  checkout or pay. A notice bars the top of every store page.
                  Staff can still place orders on a customer&apos;s behalf.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
