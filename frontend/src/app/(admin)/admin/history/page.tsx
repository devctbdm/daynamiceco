'use client';

import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { auditApi, type AuditLog } from '@/lib/api';
import {
  Activity,
  CheckCircle2,
  Clock3,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

const roleLabel = (role?: string) =>
  role === 'super_admin'
    ? 'Super admin'
    : role === 'admin'
      ? 'Admin'
      : 'Manager';

const formatAction = (action: string) =>
  action === 'LOGIN'
    ? 'Signed in'
    : action
        .replace(/^(GET|POST|PUT|PATCH|DELETE) /, '$1 ')
        .replaceAll('/api/', '');

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));

export default function AdminHistoryTracking() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const { data } = await auditApi.getAll({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          role,
          status,
        });
        if (data.success) {
          setLogs(data.logs);
          setTotal(data.total);
          setPages(data.pages);
        }
      } catch {
        toast.error('Unable to load admin history');
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [page, role, search, status]);

  const successful = logs.filter(
    (log) => (log.changes?.statusCode || 200) < 400
  ).length;
  const failed = logs.filter(
    (log) => (log.changes?.statusCode || 200) >= 400
  ).length;

  return (
    <>
      <SiteHeader />
      <main className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" /> Security audit trail
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Admin activity
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review who accessed or changed store data, when it happened, and
              from which IP.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 py-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Super admin only
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-semibold">{total}</p>
                <p className="text-xs text-muted-foreground">Matching events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-semibold">{successful}</p>
                <p className="text-xs text-muted-foreground">
                  Successful on this page
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-semibold">{failed}</p>
                <p className="text-xs text-muted-foreground">
                  Failed on this page
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search action, admin, or IP address"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={role}
                onValueChange={(value) => {
                  setRole(value ?? 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-44">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value ?? 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="All results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="success">Successful</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP address</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        Loading activity...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No matching activity found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const isSuccess = (log.changes?.statusCode || 200) < 400;
                      return (
                        <TableRow key={log._id}>
                          <TableCell>
                            <div className="font-medium">
                              {log.actor?.name || 'Unknown admin'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {roleLabel(log.actor?.role)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatAction(log.action)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.ip || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isSuccess ? 'secondary' : 'destructive'}
                            >
                              {isSuccess
                                ? 'Success'
                                : `Failed (${log.changes?.statusCode})`}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(log.createdAt)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {pages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={page === 1}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-sm text-muted-foreground">
                      Page {page} of {pages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={page === pages}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < pages) setPage(page + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
