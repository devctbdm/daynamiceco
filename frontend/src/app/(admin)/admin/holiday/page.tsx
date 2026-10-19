'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Eye,
  Gift,
  Percent,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store';
import { holidayApi, type HolidayConfig } from '@/lib/api';

function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
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

export default function AdminHolidayPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HolidayConfig>({
    heroBadge: 'Special Holiday Offer',
    title: 'Mega Offer',
    subtitle:
      'Celebrate the season with amazing deals on your favorite products!',
    discountPercent: 70,
    endDate: '2026-12-31T23:59:59',
    couponCode: 'HOLIDAY10',
    couponDescription:
      'Use the code below at checkout and stack your savings on top of holiday prices.',
    topDealsTitle: 'Top Holiday Deals',
    topDealsSubtitle: 'Hand-picked favorites at their lowest prices of the year.',
    active: true,
  });

  useEffect(() => {
    if (!isLoading && user && user.role !== 'super_admin') {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, user, router]);

  const load = async () => {
    try {
      const { data } = await holidayApi.getConfig();
      setForm((prev) => ({ ...prev, ...data.config }));
    } catch {
      toast.error('Could not load holiday settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setField = <K extends keyof HolidayConfig>(
    key: K,
    value: HolidayConfig[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Partial<HolidayConfig> = {
        ...form,
        endDate: toIso(toLocalInput(form.endDate)),
      };
      const { data } = await holidayApi.updateConfig(body);
      setForm((prev) => ({ ...prev, ...data.config }));
      toast.success('Holiday settings saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save holiday settings');
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
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Holiday Page</h2>
          <p className="text-muted-foreground">
            Manage the hero title, discount banner, countdown and coupon shown on
            the storefront holiday page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reload
          </Button>
          <Link
            href="/holiday"
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

      <Card
        className={
          form.active ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/20' : ''
        }
      >
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">
                  {form.active ? 'Holiday page is live' : 'Holiday page is hidden'}
                </p>
                <Badge variant={form.active ? 'secondary' : 'destructive'}>
                  {form.active ? 'ACTIVE' : 'OFF'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Toggle below to show or hide the holiday promotions on the
                storefront.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="active">Visible</Label>
            <Switch
              id="active"
              checked={!!form.active}
              onCheckedChange={(v) => setField('active', v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hero &amp; Banner</CardTitle>
            <CardDescription>
              These drive the big title, the discount headline and the countdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="heroBadge">Badge</Label>
              <Input
                id="heroBadge"
                value={form.heroBadge ?? ''}
                onChange={(e) => setField('heroBadge', e.target.value)}
                placeholder="Special Holiday Offer"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Hero title</Label>
                <Input
                  id="title"
                  value={form.title ?? ''}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Mega Offer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercent">Discount % (Up to X% OFF)</Label>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="discountPercent"
                    type="number"
                    min={0}
                    max={100}
                    className="pl-9"
                    value={form.discountPercent ?? 0}
                    onChange={(e) =>
                      setField('discountPercent', Number(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                rows={2}
                value={form.subtitle ?? ''}
                onChange={(e) => setField('subtitle', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Countdown end date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={toLocalInput(form.endDate)}
                onChange={(e) => setField('endDate', toIso(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                The &quot;Offer Ends In&quot; countdown counts down to this time.
                Leave empty to hide the countdown.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topDealsTitle">Top Deals heading</Label>
              <Input
                id="topDealsTitle"
                value={form.topDealsTitle ?? ''}
                onChange={(e) => setField('topDealsTitle', e.target.value)}
                placeholder="Top Holiday Deals"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topDealsSubtitle">Top Deals subheading</Label>
              <Input
                id="topDealsSubtitle"
                value={form.topDealsSubtitle ?? ''}
                onChange={(e) => setField('topDealsSubtitle', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout Coupon</CardTitle>
            <CardDescription>
              Shown in the coupon box on the holiday page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="couponCode">Coupon code</Label>
              <Input
                id="couponCode"
                value={form.couponCode ?? ''}
                onChange={(e) => setField('couponCode', e.target.value)}
                placeholder="HOLIDAY10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="couponDescription">Coupon description</Label>
              <Textarea
                id="couponDescription"
                rows={3}
                value={form.couponDescription ?? ''}
                onChange={(e) => setField('couponDescription', e.target.value)}
              />
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <Gift className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Tip: create a matching promo code in{' '}
                <Link href="/admin/promo" className="underline">
                  Promo Codes
                </Link>{' '}
                so the coupon actually applies at checkout.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
