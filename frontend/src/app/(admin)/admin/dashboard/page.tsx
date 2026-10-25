'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  LogIn,
  PencilLine,
  Package,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

import { SiteHeader } from '@/components/site-header';
import { useIsMobile } from '@/hooks/use-mobile';
import { dashboardStatsResource, storePublicResource } from '@/lib/resources';
import type { DashboardStats, Order, OrderStatus } from '@/lib/api';

// Restrained accent palette shared by the area chart and the category donut,
// so every visualization reads as one system. Deliberately limited contrast
// steps (not neon) to match the monochrome admin theme.
const AREA_COLOR = {
  line: 'oklch(0.55 0.16 262)',
  fillFrom: 'oklch(0.55 0.16 262 / 35%)',
  fillTo: 'oklch(0.55 0.16 262 / 2%)',
};
const DONUT_PALETTE = [
  'oklch(0.55 0.16 262)',
  'oklch(0.58 0.14 218)',
  'oklch(0.6 0.14 300)',
  'oklch(0.6 0.13 158)',
  'oklch(0.72 0.13 78)',
];

// --- Helpers ---

const formatTaka = (n: number) =>
  `৳${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatShort = (n: number) =>
  n >= 1000000
    ? `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
      : `${n}`;

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const shortId = (id: string) => `ORD-${id.slice(-5).toUpperCase()}`;

const timeAgo = (iso: string | null) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

// --- Shared building blocks ---

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-2.5 text-muted-foreground [&_svg]:size-4">
        {icon}
      </div>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

// --- Skeletons ---

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="mb-2 h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function PanelSkeleton({
  className,
  rows = 5,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="mb-2 h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-3.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-30" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

// --- Badges ---

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variants: Record<OrderStatus, string> = {
    pending:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    processing:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    confirmed:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    send_courier:
      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800',
    delivered:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
    cancelled:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {status === 'send_courier'
        ? 'Sent to courier'
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// --- KPI Cards ---

type Trend = 'up' | 'down' | 'flat';

function KpiCard({
  title,
  value,
  hint,
  trend,
  icon,
  tint,
}: {
  title: string;
  value: string;
  hint: React.ReactNode;
  icon: React.ReactNode;
  tint: string;
  trend?: { direction: Trend; label: string };
}) {
  return (
    <Card className="gap-2 py-5 transition-shadow hover:shadow-sm">
      <CardHeader className="pb-1">
        <CardDescription className="flex items-center justify-between text-xs leading-none font-medium tracking-wide text-muted-foreground uppercase">
          <span>{title}</span>
          <span className={`rounded-md p-1.5 ${tint} [&_svg]:size-3.5`}>
            {icon}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          {trend && trend.direction !== 'flat' && (
            <span
              className={`flex items-center gap-0.5 font-medium ${
                trend.direction === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="size-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden="true" />
              )}
              {trend.label}
            </span>
          )}
          <span className={trend && trend.direction !== 'flat' ? '' : undefined}>
            {hint}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Revenue trend (area chart) ---

function RevenueTrendCard({
  data,
  change,
}: {
  data: { label: string; value: number }[];
  change: { trend: Trend; change: string };
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const year = new Date().getFullYear();
  const hasData = total > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">
          Revenue trend
        </CardTitle>
        <CardDescription>Monthly sales for {year}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {hasData ? (
          <ChartContainer
            config={
              {
                value: { label: 'Revenue', color: AREA_COLOR.line },
              } satisfies ChartConfig
            }
            className="aspect-auto h-60 w-full"
          >
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ left: 4, right: 12, top: 8 }}
            >
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AREA_COLOR.fillFrom} />
                  <stop offset="100%" stopColor={AREA_COLOR.fillTo} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => String(value).slice(0, 3)}
              />
              <YAxis
                dataKey="value"
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(value) => formatShort(Number(value))}
              />
              <ChartTooltip
                cursor={{ stroke: AREA_COLOR.line, strokeOpacity: 0.25 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => formatTaka(Number(value))}
                  />
                }
              />
              <Area
                dataKey="value"
                type="monotone"
                fill="url(#revenueFill)"
                stroke={AREA_COLOR.line}
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyState
            icon={<TrendingUp />}
            title="No sales yet"
            description="Revenue will show up here as soon as your first order comes in."
          />
        )}
      </CardContent>
      {hasData && (
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            {formatTaka(total)} total
            {change.trend !== 'flat' && (
              <span
                className={`flex items-center gap-0.5 ${
                  change.trend === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {change.trend === 'up' ? (
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="size-3.5" aria-hidden="true" />
                )}
                {change.change.replace(' vs last month', '')} MoM
              </span>
            )}
          </div>
          <div className="text-xs leading-none text-muted-foreground">
            Compared to the previous month
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// --- Sales by category (donut) ---

function CategoryDonutCard({
  data,
  revenue,
}: {
  data: { name: string; value: number }[];
  /** All-time revenue, shown at the centre of the donut. */
  revenue: number;
}) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);

  const config = Object.fromEntries(
    data.map((_, i) => [
      `category${i}`,
      { label: data[i].name, color: DONUT_PALETTE[i % DONUT_PALETTE.length] },
    ])
  ) satisfies ChartConfig;

  const chartData = data.map((d, i) => ({
    ...d,
    key: `category${i}`,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">
          Sales by category
        </CardTitle>
        <CardDescription>Where your revenue comes from</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-4">
        {hasData ? (
          <>
            <div className="relative aspect-square max-h-55 w-full max-w-55">
              <ChartContainer config={config} className="aspect-square size-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {data.find((_, i) => `category${i}` === name)?.name}
                            </span>
                            <span className="font-medium tabular-nums">
                              {value}%
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={54}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={2}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={entry.key}
                        fill={`var(--color-category${i})`}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tracking-tight">
                  {formatTaka(revenue)}
                </span>
                <span className="text-xs text-muted-foreground">
                  total revenue
                </span>
              </div>
            </div>
            <ul className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2">
              {data.map((category, i) => (
                <li
                  key={category.name}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: DONUT_PALETTE[i % DONUT_PALETTE.length],
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium">{category.name}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {category.value}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            icon={<Package />}
            title="No sales data yet"
            description="The category breakdown appears once orders start to come in."
          />
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(() => !dashboardStatsResource.peek());
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(() => dashboardStatsResource.peek() ?? null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => (dashboardStatsResource.peek() ? Date.now() : null));
  const [storeName, setStoreName] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const isMobile = useIsMobile();

  const fetchStats = useCallback(async ({ force = false } = {}) => {
    setError(null);
    if (!force && !stats) setLoading(true);
    try {
      // Shared resource: one request even when effects double-fire
      // (StrictMode) or the page remounts inside the TTL window.
      const fresh = await dashboardStatsResource.get({ force });
      setStats(fresh);
      setUpdatedAt(Date.now());
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : 'Request failed'
      );
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    if (stats) {
      setLoading(false);
      return;
    }
    fetchStats();
  }, [fetchStats, stats]);

  // Store name for the greeting — cached resource, usually resolved already.
  useEffect(() => {
    let mounted = true;
    storePublicResource
      .get()
      .then((settings) => {
        if (mounted && typeof settings?.storeName === 'string' && settings.storeName.trim()) {
          setStoreName(settings.storeName.trim());
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const revenueMoM = (() => {
    const months = (stats?.monthlyRevenue || []).map((m) => Number(m.value) || 0);
    if (months.length < 2) return null;
    // Compare the most recent month *with* revenue against the month before it,
    // so a sparse year (revenue only in one month so far) still reads sensibly.
    const lastIdx = months.reduce((acc, value, i) => (value > 0 ? i : acc), -1);
    if (lastIdx < 0) return { change: 'No revenue yet', trend: 'flat' as const };
    const cur = months[lastIdx];
    const prev = lastIdx > 0 ? months[lastIdx - 1] : 0;
    if (prev === 0) return { change: 'New revenue this month', trend: 'flat' as const };
    const pct = ((cur - prev) / prev) * 100;
    return {
      change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last month`,
      trend: (pct >= 0 ? 'up' : 'down') as 'up' | 'down',
    };
  })();

  const current = stats;
  const pendingOrders = current?.pendingOrders ?? 0;
  const inProgress =
    (current?.ordersByStatus.processing ?? 0) +
    (current?.ordersByStatus.confirmed ?? 0) +
    (current?.ordersByStatus.send_courier ?? 0);

  const kpis = current
    ? [
        {
          title: 'Total sales',
          value: formatTaka(current.revenue),
          hint:
            revenueMoM && revenueMoM.trend !== 'flat'
              ? 'vs last month'
              : (revenueMoM?.change ?? 'All-time revenue'),
          trend:
            revenueMoM && revenueMoM.trend !== 'flat'
              ? {
                  direction: revenueMoM.trend,
                  label: revenueMoM.change.replace(' vs last month', ''),
                }
              : undefined,
          icon: <DollarSign className="text-emerald-600 dark:text-emerald-400" />,
          tint: 'bg-emerald-50 dark:bg-emerald-950/30',
        },
        {
          title: 'Total orders',
          value: current.orders.toLocaleString(),
          hint: `${inProgress} in progress`,
          icon: <ShoppingCart className="text-blue-600 dark:text-blue-400" />,
          tint: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
          title: 'Pending orders',
          value: pendingOrders.toLocaleString(),
          hint: pendingOrders > 0 ? 'Awaiting action' : 'Nothing to do',
          icon: <Clock className="text-amber-600 dark:text-amber-400" />,
          tint: 'bg-amber-50 dark:bg-amber-950/30',
        },
        {
          title: 'Total products',
          value: current.products.toLocaleString(),
          hint: `${current.productsSold.toLocaleString()} units sold`,
          icon: <Package className="text-violet-600 dark:text-violet-400" />,
          tint: 'bg-violet-50 dark:bg-violet-950/30',
        },
        {
          title: 'Customers',
          value: current.customers.toLocaleString(),
          hint: 'Registered accounts',
          icon: <Users className="text-rose-600 dark:text-rose-400" />,
          tint: 'bg-rose-50 dark:bg-rose-950/30',
        },
      ]
    : [];

  const topProducts = stats?.topProducts || [];
  const recentOrders = stats?.recentOrders || [];
  const lowStock = stats?.lowStock || [];
  const recentActivity = stats?.recentActivity || [];

  return (
    <>
      <SiteHeader />
      <div className="flex-1 space-y-6 p-4 pt-6 sm:p-6 lg:space-y-8 lg:p-8 lg:pt-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {todayLabel()} · Welcome back
              {storeName ? ` — here's how ${storeName} is doing.` : ", here's what's happening with your store."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="hidden text-xs text-muted-foreground sm:inline"
              aria-live="polite"
            >
              {loading
                ? 'Updating…'
                : updatedAt
                  ? `Updated ${timeAgo(new Date(updatedAt).toISOString())}`
                  : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats({ force: true })}
              disabled={loading}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw
                className={`size-4 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
              <span>
                <span className="font-medium">Couldn&apos;t load dashboard data.</span>{' '}
                <span className="text-muted-foreground">{error}</span>
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats({ force: true })}
            >
              Try again
            </Button>
          </div>
        )}

        {/* KPI Cards */}
        <section
          aria-label="Key performance indicators"
          className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5"
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
            : kpis.map((kpi, i) => (
                <KpiCard
                  key={i}
                  title={kpi.title}
                  value={kpi.value}
                  hint={kpi.hint}
                  trend={kpi.trend}
                  icon={kpi.icon}
                  tint={kpi.tint}
                />
              ))}
        </section>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-5">
          {loading ? (
            <ChartSkeleton className="lg:col-span-3" />
          ) : (
            <RevenueTrendCard
              data={stats?.monthlyRevenue || []}
              change={
                {
                  trend: revenueMoM?.trend ?? 'flat',
                  change: revenueMoM?.change ?? '',
                } as { trend: Trend; change: string }
              }
              key="revenue"
            />
          )}
          {loading ? (
            <ChartSkeleton className="lg:col-span-2" />
          ) : (
            <CategoryDonutCard
              data={stats?.salesByCategory || []}
              revenue={stats?.revenue ?? 0}
              key="categories"
            />
          )}
        </div>

        {/* Orders + low stock */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Recent orders
                </CardTitle>
                <CardDescription>
                  The latest activity from your storefront
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                nativeButton={false} render={<Link href="/admin/orders" />}
              >
                View all
                <ChevronRight aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton />
              ) : recentOrders.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart />}
                  title="No orders yet"
                  description="Orders from your storefront appear here in real time."
                  action={
                    <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/products" />}>
                      Manage products
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-14">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => {
                      const customer =
                        typeof order.user === 'object' && order.user
                          ? order.user
                          : null;
                      return (
                        <TableRow key={order._id} className="group">
                          <TableCell className="font-medium tabular-nums">
                            {shortId(order._id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-primary/10 text-xs">
                                  {customer ? initials(customer.name) : '??'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex min-w-0 flex-col leading-tight">
                                <span className="truncate text-sm font-medium">
                                  {customer?.name || 'Unknown customer'}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {customer?.email || '—'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={order.orderStatus} />
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {new Date(order.createdAt).toLocaleDateString(
                              'en-US',
                              { month: 'short', day: 'numeric' }
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatTaka(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`View order ${shortId(order._id)}`}
                              onClick={() => {
                                setViewOrder(order);
                                setOpen(true);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Stock alerts
                </CardTitle>
                <CardDescription>Products running low</CardDescription>
              </div>
              {lowStock.length > 0 && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  {lowStock.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="space-y-3.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : lowStock.length === 0 ? (
                <EmptyState
                  icon={<Package />}
                  title="Stock levels look healthy"
                  description="Products with 5 or fewer units will appear here so you can restock in time."
                />
              ) : (
                <ul className="space-y-1" aria-label="Low stock products">
                  {lowStock.map((product) => (
                    <li
                      key={product._id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-muted/60"
                    >
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs">
                            📦
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.sku || 'No SKU'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          product.stock === 0
                            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                        }
                      >
                        {product.stock === 0
                          ? 'Out of stock'
                          : `${product.stock} left`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            {lowStock.length > 0 && !loading && (
              <CardFooter className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  nativeButton={false} render={<Link href="/admin/products" />}
                >
                  Go to products
                  <ChevronRight aria-hidden="true" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Top products + activity */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Top selling products
                </CardTitle>
                <CardDescription>Ranked by units sold</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                nativeButton={false} render={<Link href="/admin/products" />}
              >
                View all
                <ChevronRight aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-10 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                      <Skeleton className="h-4 w-14" />
                    </div>
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <EmptyState
                  icon={<PackagePlus />}
                  title="Nothing sold yet"
                  description="Your best sellers will be ranked here as customers place orders."
                />
              ) : (
                <ol className="divide-y divide-border/70">
                  {topProducts.map((product, index) => (
                    <li
                      key={product._id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span
                        className="w-4 shrink-0 text-center text-sm font-semibold text-muted-foreground tabular-nums"
                        aria-label={`Rank ${index + 1}`}
                      >
                        {index + 1}
                      </span>
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg">
                            📦
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.sales.toLocaleString()} units sold
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatTaka(product.revenue)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Recent activity
                </CardTitle>
                <CardDescription>Latest admin actions</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Full audit history"
                nativeButton={false} render={<Link href="/admin/history" />}
              >
                <ExternalLink aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-4/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <EmptyState
                  icon={<Activity />}
                  title="No activity yet"
                  description="Logins and admin changes will show up here."
                />
              ) : (
                <ul className="space-y-1" aria-label="Recent admin activity">
                  {recentActivity.map((entry) => {
                    const action = entry.action || '';
                    const failed = entry.statusCode != null && entry.statusCode >= 400;
                    const [icon, tint] = (() => {
                      if (/login/i.test(action) || /login/i.test(entry.eventType)) {
                        return [<LogIn key="a" className="text-blue-600 dark:text-blue-400" />, 'bg-blue-50 dark:bg-blue-950/30'];
                      }
                      if (/delete|removed/i.test(action)) {
                        return [<Trash2 key="b" className="text-red-600 dark:text-red-400" />, 'bg-red-50 dark:bg-red-950/30'];
                      }
                      if (/update|edit|patch/i.test(action)) {
                        return [<PencilLine key="c" className="text-amber-600 dark:text-amber-400" />, 'bg-amber-50 dark:bg-amber-950/30'];
                      }
                      if (/create|added|new/i.test(action)) {
                        return [<PackagePlus key="d" className="text-emerald-600 dark:text-emerald-400" />, 'bg-emerald-50 dark:bg-emerald-950/30'];
                      }
                      return [<Activity key="e" className="text-muted-foreground" />, 'bg-muted'];
                    })();
                    return (
                      <li
                        key={entry._id}
                        className="flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-muted/60"
                      >
                        <span
                          className={`mt-0.5 rounded-full p-1.5 ${tint} [&_svg]:size-3.5`}
                          aria-hidden="true"
                        >
                          {icon}
                        </span>
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="truncate text-sm" title={action}>
                            {action}
                            {failed ? (
                              <Badge
                                variant="outline"
                                className="ml-1.5 border-red-200 bg-red-50 px-1 py-0 text-[0.65rem] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                              >
                                failed
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.actorName} · {timeAgo(entry.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order details drawer */}
        <Drawer
          open={open}
          onOpenChange={setOpen}
          showSwipeHandle={isMobile}
          swipeDirection={isMobile ? 'down' : 'right'}
        >
          <DrawerContent>
            {viewOrder && (
              <>
                <DrawerHeader>
                  <DrawerTitle>{shortId(viewOrder._id)}</DrawerTitle>
                  <DrawerDescription>
                    Order details for{' '}
                    {typeof viewOrder.user === 'object' && viewOrder.user
                      ? viewOrder.user.name
                      : 'Customer'}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Customer
                      </p>
                      <p className="text-sm font-medium">
                        {typeof viewOrder.user === 'object' && viewOrder.user
                          ? viewOrder.user.name
                          : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Email
                      </p>
                      <p className="text-sm">
                        {typeof viewOrder.user === 'object' && viewOrder.user
                          ? viewOrder.user.email
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <OrderStatusBadge status={viewOrder.orderStatus} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Date
                      </p>
                      <p className="text-sm">
                        {new Date(viewOrder.createdAt).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Items
                      </p>
                      <p className="text-sm">
                        {viewOrder.items.reduce((s, it) => s + it.quantity, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Amount
                      </p>
                      <p className="text-sm font-medium">
                        {formatTaka(viewOrder.totalAmount)}
                      </p>
                    </div>
                  </div>
                  {viewOrder.items.length > 0 && (
                    <div className="rounded-lg border">
                      <div className="divide-y">
                        {viewOrder.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 text-sm"
                          >
                            <span className="truncate">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="ml-2 shrink-0 font-medium tabular-nums">
                              {formatTaka(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DrawerFooter className="flex-row justify-between gap-2">
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/orders" />}>
                    Open in orders
                  </Button>
                  <DrawerClose>Close</DrawerClose>
                </DrawerFooter>
              </>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
