'use client';

import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { visitorApi, type VisitorOverview } from '@/lib/api';
import { Activity, BarChart3, Eye, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

const deviceColors = ['#2563eb', '#14b8a6', '#f97316', '#8b5cf6'];
type DeviceFilter = 'all' | 'desktop' | 'mobile' | 'tablet';

const formatDate = (value: unknown) => {
  const text = String(value ?? '');
  return text.length === 8 ? `${text.slice(4, 6)}/${text.slice(6, 8)}` : text;
};

export default function VisitorAnalyze() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<VisitorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    visitorApi
      .getOverview(days)
      .then((response) => {
        if (active) setData(response.data.data);
      })
      .catch((error) => {
        if (active) {
          setData(null);
          toast.error(
            error?.response?.data?.message ||
              'Could not load visitor analytics.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const visibleDevices =
    data?.devices.filter(
      (device) => deviceFilter === 'all' || device.device === deviceFilter
    ) || [];

  return (
    <>
      <SiteHeader />
      <main className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Visitor Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Live visitor insights from Google Analytics 4.
            </p>
          </div>
          <Select
            value={String(days)}
            onValueChange={(value) => setDays(Number(value) as 7 | 30 | 90)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!data && loading && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Loading visitor analytics...
            </CardContent>
          </Card>
        )}
        {!data && !loading && (
          <Card>
            <CardContent className="space-y-2 p-8 text-center">
              <p className="font-medium">Google Analytics is not ready</p>
              <p className="text-sm text-muted-foreground">
                Configure the GA4 environment variables and grant the service
                account Viewer access to the GA4 property.
              </p>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Active users"
                value={data.summary.activeUsers}
                icon={Users}
              />
              <StatCard
                title="New users"
                value={data.summary.newUsers}
                icon={Activity}
              />
              <StatCard
                title="Sessions"
                value={data.summary.sessions}
                icon={BarChart3}
              />
              <StatCard
                title="Page views"
                value={data.summary.pageViews}
                icon={Eye}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Visitors and sessions</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily} margin={{ left: 4, right: 12 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        minTickGap={24}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={formatDate} />
                      <Bar
                        dataKey="activeUsers"
                        name="Active users"
                        fill="#2563eb"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="sessions"
                        name="Sessions"
                        fill="#14b8a6"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gap-4">
                  <CardTitle>Devices</CardTitle>
                  <Tabs
                    value={deviceFilter}
                    onValueChange={(value) =>
                      setDeviceFilter(value as DeviceFilter)
                    }
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="desktop">Desktop</TabsTrigger>
                      <TabsTrigger value="mobile">Mobile</TabsTrigger>
                      <TabsTrigger value="tablet">Tablet</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={visibleDevices}
                        dataKey="activeUsers"
                        nameKey="device"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {visibleDevices.map((entry, index) => (
                          <Cell
                            key={entry.device}
                            fill={deviceColors[index % deviceColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                    {visibleDevices.map((device, index) => (
                      <span key={device.device}>
                        <span
                          className="mr-1 inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              deviceColors[index % deviceColors.length],
                          }}
                        />
                        {device.device}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {data.topPages.map((page) => (
                    <div
                      key={page.path}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{page.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {page.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="secondary">
                          {page.pageViews} views
                        </Badge>
                        <span className="text-muted-foreground">
                          {page.activeUsers} users
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
