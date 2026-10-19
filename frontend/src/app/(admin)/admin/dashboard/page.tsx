'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  dashboardApi,
  smsApi,
  type DashboardStats,
  type Order,
  type OrderStatus,
} from '@/lib/api';

import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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

export const description = 'A bar chart with a custom label';

const chartConfig = {
  value: {
    label: 'Sales',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

// --- Helpers ---
const formatTaka = (n: number) =>
  `৳${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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

// --- Skeleton Components ---

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-25" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-35 mb-2" />
        <Skeleton className="h-4 w-30" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-50" />
            <Skeleton className="h-4 w-37.5" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-15" />
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
    cancelled:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// --- Revenue Chart ---

export function ChartBarLabelCustom({
  data,
  className,
}: {
  data: { label: string; value: number }[];
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const year = new Date().getFullYear();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Sales by Month</CardTitle>
        <CardDescription>Total sales for {year} (Jan - Dec)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-100">
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              width={40}
            />
            <XAxis dataKey="value" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) => formatTaka(Number(value))}
                />
              }
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={4}>
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value) => `৳${formatShort(Number(value))}`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Total: {formatTaka(total)} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total sales for {year} — updates automatically each month
        </div>
      </CardFooter>
    </Card>
  );
}
// --- Stat Card ---

function StatCard({
  title,
  value,
  change,
  trend,
  icon,
  color,
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'flat';
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          {trend === 'up' && (
            <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-600" />
          )}
          {trend === 'down' && (
            <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
          )}
          <span
            className={
              trend === 'up'
                ? 'text-emerald-600'
                : trend === 'down'
                  ? 'text-red-600'
                  : undefined
            }
          >
            {change}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [open, setOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await dashboardApi.getStats();
        if (mounted && data.success) setStats(data.stats);
      } catch {
        // leave stats null; UI shows empty states
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const revenueMoM = (() => {
    const m = stats?.monthlyRevenue || [];
    if (m.length < 2) return null;
    const cur = m[m.length - 1].value;
    const prev = m[m.length - 2].value;
    if (prev === 0)
      return {
        change: cur > 0 ? 'New revenue this month' : 'No revenue yet',
        trend: 'flat' as const,
      };
    const pct = ((cur - prev) / prev) * 100;
    return {
      change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last month`,
      trend: (pct >= 0 ? 'up' : 'down') as 'up' | 'down',
    };
  })();

  const statCards = stats
    ? [
        {
          title: 'Total Revenue',
          value: formatTaka(stats.revenue),
          change: revenueMoM?.change ?? 'All time revenue',
          trend: revenueMoM?.trend ?? ('flat' as const),
          icon: <DollarSign className="h-4 w-4" />,
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
        },
        {
          title: 'Orders',
          value: stats.orders.toLocaleString(),
          change: `${stats.ordersByStatus.pending} pending · ${stats.ordersByStatus.processing} processing · ${stats.ordersByStatus.confirmed} confirmed · ${stats.ordersByStatus.send_courier} sent`,
          trend: 'flat' as const,
          icon: <ShoppingCart className="h-4 w-4" />,
          color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
        },
        {
          title: 'Customers',
          value: stats.customers.toLocaleString(),
          change: 'Registered customers',
          trend: 'flat' as const,
          icon: <Users className="h-4 w-4" />,
          color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30',
        },
        {
          title: 'Products Sold',
          value: stats.productsSold.toLocaleString(),
          change: `${stats.products} active products`,
          trend: 'flat' as const,
          icon: <Package className="h-4 w-4" />,
          color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
        },
      ]
    : [];

  const categoryColors = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-rose-500',
  ];

  const topProducts = stats?.topProducts || [];
  const recentOrders = stats?.recentOrders || [];

  return (
    <>
      <SiteHeader />
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your store.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            : statCards.map((stat, i) => <StatCard key={i} {...stat} />)}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Sales by Month chart */}
          {loading ? (
            <Card className="col-span-4">
              <CardHeader>
                <Skeleton className="h-6 w-37.5 mb-2" />
                <Skeleton className="h-4 w-62.5" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-75 w-full" />
              </CardContent>
            </Card>
          ) : (
            <ChartBarLabelCustom
              data={stats?.monthlyRevenue || []}
              className="col-span-4"
            />
          )}

          {/* Sales by Category */}
          {loading ? (
            <Card className="col-span-3">
              <CardHeader>
                <Skeleton className="h-6 w-35 mb-2" />
                <Skeleton className="h-4 w-50" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>
                  Distribution across product categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {stats?.salesByCategory.length ? (
                  stats.salesByCategory.map((category, i) => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-muted-foreground">
                          {category.value}%
                        </span>
                      </div>
                      <Progress value={category.value} className="h-2">
                        <div
                          className={`h-full ${
                            categoryColors[i % categoryColors.length]
                          } rounded-full`}
                          style={{ width: `${category.value}%` }}
                        />
                      </Progress>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No sales data yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom Section: Orders & Products */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    Latest {recentOrders.length} orders
                  </CardDescription>
                </div>
                <Link href="/admin/orders">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton />
                ) : recentOrders.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No orders yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-12.5">Action</TableHead>
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
                            <TableCell className="font-medium">
                              {shortId(order._id)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/10">
                                    {customer ? initials(customer.name) : '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {customer?.name || 'Unknown customer'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {customer?.email || '—'}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.orderStatus} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatTaka(order.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
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
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Products</CardTitle>
                  <CardDescription>
                    Best performing products by units sold
                  </CardDescription>
                </div>
                <Link href="/admin/products">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton />
                ) : topProducts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No products sold yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                                {product.image ? (
                                  <Image
                                    src={product.image}
                                    alt={product.name}
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
                              <span className="font-medium">
                                {product.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.sales.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatTaka(product.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                <div className="p-4 space-y-4">
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
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
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
                            <span className="ml-2 shrink-0 font-medium">
                              {formatTaka(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DrawerFooter>
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
