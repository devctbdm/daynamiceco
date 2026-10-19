'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StaffAuditEntry, StaffStats } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Shield,
  UserCog,
} from 'lucide-react';
import { EVENT_COLORS, EVENT_LABELS, ROLE_MAP } from './constants';

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between pt-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          )}
          {sub && !loading && (
            <p className="text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        <div className="rounded-lg bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Role Distribution ──────────────────────────────────────────────────────

function RoleBar({ role, count, total }: { role: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const meta = ROLE_MAP[role];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{meta?.label ?? role}</span>
        <span className="tabular-nums text-muted-foreground">
          {count} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Activity feed ──────────────────────────────────────────────────────────

function ActivityRow({ entry }: { entry: StaffAuditEntry }) {
  const label = EVENT_LABELS[entry.eventType] ?? entry.action;
  const color =
    EVENT_COLORS[entry.eventType] ??
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  const when = entry.createdAt
    ? formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })
    : '—';
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Badge className={`mt-0.5 shrink-0 text-xs font-medium ${color}`}>
        {label}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {entry.actor?.name ?? 'System'}
          {entry.changes?.target ? (
            <span className="font-normal text-muted-foreground">
              {' '}→ {String(entry.changes.target)}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">{when}</p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

interface OverviewTabProps {
  stats: StaffStats | null;
  recentActivity: StaffAuditEntry[];
  loading: boolean;
}

export function OverviewTab({ stats, recentActivity, loading }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total staff"
          value={stats?.total ?? 0}
          icon={Users}
          loading={loading}
        />
        <StatCard
          label="Active"
          value={stats?.active ?? 0}
          icon={UserCheck}
          sub={stats ? `${stats.total - stats.active} inactive` : undefined}
          loading={loading}
        />
        <StatCard
          label="Inactive"
          value={stats?.inactive ?? 0}
          icon={UserX}
          loading={loading}
        />
        <StatCard
          label="Super admins"
          value={stats?.byRole?.super_admin ?? 0}
          icon={ShieldCheck}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Role distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : stats ? (
              <>
                <RoleBar role="super_admin" count={stats.byRole.super_admin} total={stats.total} />
                <RoleBar role="admin" count={stats.byRole.admin} total={stats.total} />
                <RoleBar role="manager" count={stats.byRole.manager} total={stats.total} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserCog className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No recent staff activity</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentActivity.map((entry) => (
                  <ActivityRow key={entry._id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
