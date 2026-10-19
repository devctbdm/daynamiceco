'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StaffMember } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldOff,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { ROLES, ROLE_MAP } from './constants';

// ── Helpers ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: StaffMember['role'] }) {
  const meta = ROLE_MAP[role];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta?.color ?? 'bg-gray-100 text-gray-700'}`}
    >
      {meta?.label ?? role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'secondary' : 'outline'} className="text-xs">
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function PermissionSourceBadge({ member }: { member: StaffMember }) {
  if (member.role === 'super_admin') {
    return <span className="text-xs text-muted-foreground">Full access</span>;
  }
  if (member.customPermissions?.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
        <KeyRound className="h-3 w-3" />
        Custom
      </span>
    );
  }
  if (member.permissionGroup) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: `${member.permissionGroup.color}22`, color: member.permissionGroup.color }}
      >
        {member.permissionGroup.name}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Role defaults</span>;
}

// ── Row skeleton ──────────────────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
    </TableRow>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export interface StaffTableProps {
  members: StaffMember[];
  loading: boolean;
  total: number;
  page: number;
  pages: number;
  search: string;
  roleFilter: string;
  statusFilter: string;
  currentUserId: string;
  onSearchChange: (v: string) => void;
  onRoleFilterChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onEdit: (m: StaffMember) => void;
  onToggleStatus: (m: StaffMember) => void;
  onDelete: (m: StaffMember) => void;
}

export function StaffTable({
  members,
  loading,
  total,
  page,
  pages,
  search,
  roleFilter,
  statusFilter,
  currentUserId,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onPageChange,
  onEdit,
  onToggleStatus,
  onDelete,
}: StaffTableProps) {
  const [confirmTarget, setConfirmTarget] = useState<StaffMember | null>(null);

  const handleDeleteConfirm = () => {
    if (confirmTarget) {
      onDelete(confirmTarget);
      setConfirmTarget(null);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name, email or phone…"
                className="pl-9"
                maxLength={100}
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => onRoleFilterChange(v ?? 'all')}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? 'all')}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="hidden lg:table-cell">Last login</TableHead>
                  <TableHead className="hidden xl:table-cell">Permissions</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">No staff members found</p>
                        <p className="text-xs">
                          {search || roleFilter !== 'all' || statusFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first staff member to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => {
                    const isSelf = member._id === currentUserId;
                    const created = member.createdAt
                      ? new Date(member.createdAt).toLocaleDateString('en-GB')
                      : '—';
                    const lastLogin = member.lastLogin
                      ? formatDistanceToNow(new Date(member.lastLogin), { addSuffix: true })
                      : 'Never';

                    return (
                      <TableRow key={member._id} className={!member.active ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground">
                              {member.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate font-medium">
                                {member.name}
                                {isSelf && (
                                  <span className="rounded bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><RoleBadge role={member.role} /></TableCell>
                        <TableCell><StatusBadge active={member.active} /></TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {created}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {lastLogin}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <PermissionSourceBadge member={member} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(member)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {!isSelf && (
                                <DropdownMenuItem onClick={() => onToggleStatus(member)}>
                                  {member.active ? (
                                    <>
                                      <ShieldOff className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {!isSelf && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setConfirmTarget(member)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {total} member{total !== 1 ? 's' : ''} · page {page} of {pages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= pages}
                  onClick={() => onPageChange(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes their admin access and cannot be undone.
              If they are the last active super admin this action will be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
