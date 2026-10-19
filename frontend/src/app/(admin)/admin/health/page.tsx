'use client';

import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { healthApi, type HealthService, type HealthStatus } from '@/lib/api';
import {
  Activity,
  CheckCircle2,
  Database,
  MemoryStick,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

const REFRESH_MS = 10000;
const MAX_UPTIME_POINTS = 30;

type UptimePoint = {
  time: string;
  uptime: number;
  status: 'healthy' | 'unhealthy';
};

const uptimeChartConfig = {
  uptime: {
    label: 'Uptime (minutes)',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function ServiceCard({
  name,
  service,
  icon: Icon,
}: {
  name: string;
  service: HealthService;
  icon: typeof Activity;
}) {
  const isHealthy = service.status === 'healthy';
  const isDisabled = service.status === 'disabled';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{name}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {isHealthy ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle
              className={`h-4 w-4 ${isDisabled ? 'text-muted-foreground' : 'text-red-600'}`}
            />
          )}
          <Badge variant={isHealthy ? 'default' : 'secondary'}>
            {isDisabled ? 'Disabled' : isHealthy ? 'Healthy' : 'Unhealthy'}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{service.message}</p>
        {service.name && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Database: {service.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uptimeHistory, setUptimeHistory] = useState<UptimePoint[]>([]);

  const loadHealth = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const { data } = await healthApi.getStatus();
      setHealth(data);
      setUptimeHistory((previous) =>
        [
          ...previous,
          {
            time: new Date(data.checkedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            uptime: Number((data.uptimeSeconds / 60).toFixed(1)),
            status: data.status,
          },
        ].slice(-MAX_UPTIME_POINTS)
      );
    } catch (error: any) {
      const data = error?.response?.data as HealthStatus | undefined;
      if (data) setHealth(data);
      else toast.error('Health check failed. The backend may be offline.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    const timer = window.setInterval(() => loadHealth(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadHealth]);

  const operational = health?.status === 'healthy';

  return (
    <>
      <SiteHeader />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
            <p className="text-sm text-muted-foreground">
              Live service status for the Apple IT Zone platform.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => loadHealth(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh now
          </Button>
        </div>

        <Card
          className={
            health
              ? operational
                ? 'border-emerald-500/40'
                : 'border-red-500/40'
              : ''
          }
        >
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              {!health ? (
                <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
              ) : operational ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <p className="font-semibold">
                  {!health
                    ? 'Checking services...'
                    : operational
                      ? 'All systems operational'
                      : 'Service attention required'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {health
                    ? `Last checked ${new Date(health.checkedAt).toLocaleTimeString()}`
                    : 'Waiting for the first response'}
                </p>
              </div>
            </div>
            {health && (
              <div className="text-sm text-muted-foreground">
                Auto-refresh: 10 seconds
              </div>
            )}
          </CardContent>
        </Card>

        {health && (
          <div className="grid gap-6 md:grid-cols-3">
            <ServiceCard
              name="API Server"
              service={health.services.api}
              icon={Server}
            />
            <ServiceCard
              name="MongoDB"
              service={health.services.database}
              icon={Database}
            />
            <ServiceCard
              name="Redis Cache"
              service={health.services.redis}
              icon={MemoryStick}
            />
          </div>
        )}

        {health && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uptime</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatUptime(health.uptimeSeconds)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Memory usage</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {health.memory.usedMb} MB
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Runtime</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {health.nodeVersion}
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Uptime trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              Live server uptime collected from each health check.
            </p>
          </CardHeader>
          <CardContent>
            {uptimeHistory.length < 2 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Collecting uptime samples...
              </div>
            ) : (
              <ChartContainer
                config={uptimeChartConfig}
                className="h-64 w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={uptimeHistory}
                  margin={{ left: 12, right: 12, top: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={28}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={42}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Line
                    dataKey="uptime"
                    type="natural"
                    stroke="var(--color-uptime)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
