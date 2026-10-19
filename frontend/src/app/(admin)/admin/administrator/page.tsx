'use client';

import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  permissionGroupApi,
  staffApi,
  type PermissionGroup,
  type StaffAuditEntry,
  type StaffMember,
  type StaffStats,
} from '@/lib/api';
import { useAuth } from '@/store';
import { Activity, Layers, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { OverviewTab } from './_components/OverviewTab';
import { PermissionGroupsTab } from './_components/PermissionGroupsTab';
import type { StaffFormState } from './_components/StaffDialogs';
import { CreateStaffDialog, EditStaffDialog } from './_components/StaffDialogs';
import { StaffTable } from './_components/StaffTable';

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdministratorPage() {
  const { user } = useAuth();

  // ── Overview state ───────────────────────────────────────────────────────
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<StaffAuditEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Staff table state ────────────────────────────────────────────────────
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  // ── Permission groups state ───────────────────────────────────────────────
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await staffApi.getStats();
      setStats(data.stats);
      setRecentActivity(data.recentActivity ?? []);
    } catch {
      toast.error('Failed to load staff statistics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const { data } = await staffApi.getAll({
        page,
        limit: 15,
        search: search || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setMembers(data.members ?? []);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Failed to load staff members');
    } finally {
      setStaffLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const { data } = await permissionGroupApi.getAll();
      setGroups(data.groups ?? []);
    } catch {
      toast.error('Failed to load permission groups');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchGroups();
  }, [fetchStats, fetchGroups]);

  // Re-fetch staff when filters/page change (debounced for search)
  useEffect(() => {
    const id = setTimeout(fetchStaff, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [fetchStaff, search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  // ── Staff actions ─────────────────────────────────────────────────────────

  const buildStaffPayload = (form: StaffFormState) => ({
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    role: form.role,
    active: form.active,
    ...(form.password ? { password: form.password } : {}),
    ...(form.permissionMode === 'custom'
      ? { customPermissions: form.customPermissions, permissionGroup: null }
      : form.permissionMode === 'group'
        ? { permissionGroup: form.permissionGroupId || null, customPermissions: [] }
        : { permissionGroup: null, customPermissions: [] }),
  });

  const handleCreate = async (form: StaffFormState) => {
    try {
      await staffApi.create({
        ...buildStaffPayload(form),
        password: form.password, // required for create
      });
      toast.success(`${form.name.trim()} added to the team`);
      setCreateOpen(false);
      await Promise.all([fetchStaff(), fetchStats()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create staff member');
      throw e; // re-throw so dialog keeps its state
    }
  };

  const handleUpdate = async (form: StaffFormState) => {
    if (!editingMember) return;
    try {
      await staffApi.update(editingMember._id, buildStaffPayload(form));
      toast.success(`${form.name.trim()} updated`);
      setEditingMember(null);
      await Promise.all([fetchStaff(), fetchStats()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to update staff member');
      throw e;
    }
  };

  const handleToggleStatus = async (member: StaffMember) => {
    try {
      const { data } = await staffApi.toggleStatus(member._id);
      toast.success(data.message);
      await Promise.all([fetchStaff(), fetchStats()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to update status');
    }
  };

  const handleDelete = async (member: StaffMember) => {
    try {
      await staffApi.delete(member._id);
      toast.success(`${member.name} removed`);
      await Promise.all([fetchStaff(), fetchStats()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to delete staff member');
    }
  };

  // ── Permission group actions ───────────────────────────────────────────────

  const handleGroupCreate = async (form: {
    name: string;
    description: string;
    color: string;
    permissions: any[];
  }) => {
    try {
      await permissionGroupApi.create(form);
      toast.success(`Permission group "${form.name}" created`);
      await fetchGroups();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create permission group');
      throw e;
    }
  };

  const handleGroupUpdate = async (
    id: string,
    form: { name: string; description: string; color: string; permissions: any[] }
  ) => {
    try {
      await permissionGroupApi.update(id, form);
      toast.success(`Permission group updated`);
      await fetchGroups();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to update permission group');
      throw e;
    }
  };

  const handleGroupDelete = async (id: string) => {
    try {
      const { data } = await permissionGroupApi.delete(id);
      toast.success(data.message);
      await fetchGroups();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to delete permission group');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Staff & Access Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage staff accounts, roles, and module-level permissions.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Add staff member
            </Button>
          </div>

          {/* Main tabs */}
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="overview" className="gap-1.5">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-1.5">
                <Users className="h-4 w-4" />
                Staff
                {total > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-1.5">
                <Layers className="h-4 w-4" />
                Permission groups
                {groups.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {groups.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              <OverviewTab
                stats={stats}
                recentActivity={recentActivity}
                loading={statsLoading}
              />
            </TabsContent>

            {/* Staff table */}
            <TabsContent value="staff">
              <StaffTable
                members={members}
                loading={staffLoading}
                total={total}
                page={page}
                pages={pages}
                search={search}
                roleFilter={roleFilter}
                statusFilter={statusFilter}
                currentUserId={user?.id ?? ''}
                onSearchChange={(v) => setSearch(v)}
                onRoleFilterChange={(v) => setRoleFilter(v)}
                onStatusFilterChange={(v) => setStatusFilter(v)}
                onPageChange={setPage}
                onEdit={(m) => setEditingMember(m)}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            </TabsContent>

            {/* Permission groups */}
            <TabsContent value="groups">
              <PermissionGroupsTab
                groups={groups}
                loading={groupsLoading}
                onCreate={handleGroupCreate}
                onUpdate={handleGroupUpdate}
                onDelete={handleGroupDelete}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create dialog */}
      <CreateStaffDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        permissionGroups={groups}
        onSubmit={handleCreate}
      />

      {/* Edit dialog */}
      <EditStaffDialog
        member={editingMember}
        open={!!editingMember}
        onOpenChange={(o) => !o && setEditingMember(null)}
        permissionGroups={groups}
        onSubmit={handleUpdate}
      />
    </>
  );
}
