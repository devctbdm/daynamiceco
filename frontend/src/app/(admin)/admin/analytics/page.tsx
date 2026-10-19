// src/app/(admin)/analytics/page.tsx
'use client';

import { SiteHeader } from '@/components/site-header';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  analyticsApi,
  type AnalyticsPoint,
  type AnalyticsStats,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatBDT } from '@/utils/currency';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  DollarSign,
  Download,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ------------------------------------------------------------
// CUSTOM COMPONENTS
// ------------------------------------------------------------

// Stat Card with trend
function StatCard({
  title,
  value,
  subValue,
  icon,
  trend,
  trendValue,
  color,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: string;
}) {
  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn('rounded-full p-2', color)}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              {trend === 'up' ? (
                <ArrowUp className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={trend === 'up' ? 'text-green-600' : 'text-red-600'}
              >
                {trendValue}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Stat card placeholder shown while analytics load
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-25" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-7 w-30" />
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------
// MAIN ANALYTICS PAGE
// ------------------------------------------------------------
export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>(
    '12m'
  );
  const [view, setView] = useState<
    'overview' | 'sales' | 'products' | 'categories'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await analyticsApi.getStats();
        if (mounted && data.success) setAnalytics(data.data);
      } catch {
        // leave null; page shows empty states
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = analytics?.stats;

  // Format currency
  const formatCurrency = (value: number) => formatBDT(value);

  // Filter data based on time range
  const filteredData: AnalyticsPoint[] = useMemo(() => {
    if (!analytics) return [];
    if (timeRange === '12m') return analytics.monthly;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return analytics.daily.slice(-days);
  }, [timeRange, analytics]);

  // Growth for stat cards (current month vs previous, from monthly series)
  const growth = useMemo(() => {
    if (!analytics || analytics.monthly.length < 2) return null;
    const list = analytics.monthly;
    let cur = list[list.length - 1];
    let prev = list[list.length - 2];
    // skip trailing zero months if the current month has no data yet
    if (cur.revenue === 0) {
      cur = prev;
      prev = list[list.length - 3];
    }
    if (!prev || prev.revenue === 0) return null;
    return {
      revenue: (((cur.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1),
      orders:
        prev.orders > 0
          ? (((cur.orders - prev.orders) / prev.orders) * 100).toFixed(1)
          : null,
    };
  }, [analytics]);

  // Export current view as CSV
  const handleExport = () => {
    if (!filteredData.length) return;
    const rows = [
      ['Period', 'Revenue', 'Orders', 'Avg. Order'],
      ...filteredData.map((d) => [
        d.month,
        String(d.revenue),
        String(d.orders),
        String(d.avgOrderValue),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Order status distribution (real counts)
  const orderStatusData = stats
    ? [
        {
          name: 'Pending',
          value: stats.ordersByStatus.pending,
          color: '#f59e0b',
        },
        {
          name: 'Processing',
          value: stats.ordersByStatus.processing,
          color: '#3b82f6',
        },
        {
          name: 'Cancelled',
          value: stats.ordersByStatus.cancelled,
          color: '#ef4444',
        },
      ].filter((s) => s.value > 0)
    : [];

  const COLORS = [
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#eab308',
    '#ef4444',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
  ];

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="space-y-6 p-4 md:p-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">
              Overview of your store&apos;s performance and sales trends.
            </p>
          </div>

          {/* Time range / export controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-35 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* Tabs + chart */}
          <div className="space-y-4">
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-md" />
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-87.5 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const totalRevenue = stats?.revenue || 0;
  const totalOrders = stats?.orders || 0;
  const avgOrderValue = stats?.avgOrderValue || 0;
  const totalProducts = stats?.products || 0;
  const totalCustomers = stats?.customers || 0;

  return (
    <>
      <SiteHeader />
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Overview of your store&apos;s performance and sales trends.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select
              value={timeRange}
              onValueChange={(v) => setTimeRange(v as any)}
            >
              <SelectTrigger className="w-35">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------
          STATS CARDS
          ------------------------------------------------------------ */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            subValue={`${totalOrders} orders placed`}
            icon={<DollarSign className="h-4 w-4 text-white" />}
            color="bg-green-600"
            trend={growth && Number(growth.revenue) >= 0 ? 'up' : 'down'}
            trendValue={growth ? `${growth.revenue}%` : '0%'}
          />
          <StatCard
            title="Total Orders"
            value={totalOrders.toString()}
            subValue={`Avg. ${avgOrderValue.toLocaleString()} per order`}
            icon={<ShoppingCart className="h-4 w-4 text-white" />}
            color="bg-blue-600"
            trend={growth?.orders && Number(growth.orders) >= 0 ? 'up' : 'down'}
            trendValue={growth?.orders ? `${growth.orders}%` : '0%'}
          />
          <StatCard
            title="Products"
            value={totalProducts.toString()}
            subValue="In active inventory"
            icon={<Package className="h-4 w-4 text-white" />}
            color="bg-purple-600"
          />
          <StatCard
            title="Customers"
            value={totalCustomers.toString()}
            subValue="Registered users"
            icon={<Users className="h-4 w-4 text-white" />}
            color="bg-orange-600"
          />
        </div>

        {/* ------------------------------------------------------------
          TABS FOR VIEWS
          ------------------------------------------------------------ */}
        <Tabs
          defaultValue="overview"
          className="space-y-4"
          onValueChange={(v) => setView(v as any)}
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* ------------------------------------------------------------
            OVERVIEW TAB
            ------------------------------------------------------------ */}
          <TabsContent value="overview" className="space-y-4">
            {/* Revenue vs Orders Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Orders Overview</CardTitle>
                <CardDescription>
                  {timeRange === '12m'
                    ? 'Monthly revenue and order volume trends'
                    : 'Daily revenue and order volume trends'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredData.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    No sales data in this period yet.
                  </p>
                ) : (
                  <div className="h-87.5">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis
                          yAxisId="left"
                          tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                        />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === 'Revenue')
                              return [
                                `৳${Number(value).toLocaleString()}`,
                                'Revenue',
                              ];
                            return [value, 'Orders'];
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ fill: '#22c55e' }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="orders"
                          name="Orders"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Two-column: Order Status + Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Order Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                  <CardDescription>Current order breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderStatusData.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                      No orders yet.
                    </p>
                  ) : (
                    <div className="h-62.5">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {orderStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value} orders`, 'Orders']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-green-100 p-1">
                          <Package className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm">Units Sold</span>
                      </div>
                      <span className="font-semibold">
                        {(stats?.productsSold || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-blue-100 p-1">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm">Avg. Order Value</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(avgOrderValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-purple-100 p-1">
                          <ShoppingCart className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="text-sm">Items Per Order</span>
                      </div>
                      <span className="font-semibold">
                        {stats?.avgItemsPerOrder || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-orange-100 p-1">
                          <Users className="h-4 w-4 text-orange-600" />
                        </div>
                        <span className="text-sm">Repeat Customers</span>
                      </div>
                      <span className="font-semibold">
                        {stats?.repeatCustomerRate || 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ------------------------------------------------------------
            SALES TAB
            ------------------------------------------------------------ */}
          <TabsContent value="sales" className="space-y-4">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  {timeRange === '12m'
                    ? 'Monthly revenue performance'
                    : 'Daily revenue performance'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredData.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    No sales data in this period yet.
                  </p>
                ) : (
                  <div className="h-75">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis
                          tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value) => [
                            `৳${Number(value).toLocaleString()}`,
                            'Revenue',
                          ]}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Summary</CardTitle>
                <CardDescription>
                  {timeRange === '12m'
                    ? 'Detailed monthly performance metrics'
                    : 'Detailed daily performance metrics'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No sales data in this period yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">
                            Period
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Revenue
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Orders
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Avg. Order
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Growth
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, idx) => {
                          const growthPct =
                            idx > 0
                              ? ((row.revenue - filteredData[idx - 1].revenue) /
                                  (filteredData[idx - 1].revenue || 1)) *
                                100
                              : 0;
                          return (
                            <tr
                              key={idx}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="px-4 py-3 font-medium">
                                {row.month}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(row.revenue)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {row.orders}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(row.avgOrderValue)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {idx > 0 ? (
                                  <span
                                    className={
                                      growthPct >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }
                                  >
                                    {growthPct >= 0 ? '+' : ''}
                                    {growthPct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------
            TOP PRODUCTS TAB
            ------------------------------------------------------------ */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>
                  Best performing products by revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics || analytics.topProducts.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No products sold yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">#</th>
                          <th className="px-4 py-3 text-left font-medium">
                            Product
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            SKU
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Price
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Units Sold
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topProducts.map((product, idx) => (
                          <tr
                            key={product._id}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="px-4 py-3 font-medium text-muted-foreground">
                              <Badge variant="outline" className="font-mono">
                                #{idx + 1}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {product.name}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {product.productCode || product.sku || '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(product.price)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {product.unitsSold}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formatCurrency(product.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------
            CATEGORIES TAB
            ------------------------------------------------------------ */}
          <TabsContent value="categories" className="space-y-4">
            {!analytics || analytics.categories.length === 0 ? (
              <Card>
                <CardContent>
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No category sales data yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Category Revenue Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Category</CardTitle>
                    <CardDescription>
                      Which categories drive the most revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-75">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.categories} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                          />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip
                            formatter={(value) => [
                              `৳${Number(value).toLocaleString()}`,
                              'Revenue',
                            ]}
                          />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                            {analytics.categories.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>
                      Revenue breakdown by percentage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.categories.slice(0, 6).map((cat, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor: COLORS[idx % COLORS.length],
                                }}
                              />
                              {cat.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatCurrency(cat.revenue)}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {cat.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${cat.percentage}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
