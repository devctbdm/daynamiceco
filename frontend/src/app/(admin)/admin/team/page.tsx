'use client';

import { useMemo, useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Pencil,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { teamApi, type TeamMember } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";

type Role = "admin" | "manager" | "super_admin";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "super_admin", label: "Super Admin", hint: "Full access, can manage team" },
  { value: "admin", label: "Admin", hint: "Manage catalog, orders and customers" },
  { value: "manager", label: "Manager", hint: "Orders and inventory only" },
];

const roleLabel = (role: Role) =>
  ROLES.find((r) => r.value === role)?.label ?? role;

const roleBadge = (role: Role) => {
  if (role === "super_admin") return "default" as const;
  if (role === "admin") return "secondary" as const;
  return "outline" as const;
};

const memberSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  role: z.enum(["admin", "manager", "super_admin"]),
});

const createSchema = memberSchema.extend({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

type FormState = {
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  role: "manager",
  active: true,
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "—";

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function fetchMembers() {
    setLoading(true);
    try {
      const { data } = await teamApi.getAll();
      setMembers(data.members || []);
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  const stats = useMemo(() => {
    return {
      total: members.length,
      superAdmins: members.filter((m) => m.role === "super_admin").length,
      admins: members.filter((m) => m.role === "admin").length,
      managers: members.filter((m) => m.role === "manager").length,
    };
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m._id.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || m.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [members, query, roleFilter]);

  function openAdd() {
    setForm(emptyForm);
    setErrors({});
    setShowPassword(false);
    setAddOpen(true);
  }

  function openEdit(member: TeamMember) {
    const role: Role = ROLES.some((r) => r.value === member.role)
      ? (member.role as Role)
      : "manager";
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      role,
      active: member.active,
    });
    setErrors({});
    setShowPassword(false);
    setEditing(member);
  }

  function validate(schema: typeof createSchema | typeof memberSchema) {
    const result = schema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleCreate() {
    if (!validate(createSchema)) return;
    if (
      members.some(
        (m) => m.email.toLowerCase() === form.email.trim().toLowerCase()
      )
    ) {
      setErrors({ email: "This email is already in use" });
      return;
    }

    setSubmitting(true);
    try {
      await teamApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        active: form.active,
      });
      toast.success(`${form.name.trim()} added as ${roleLabel(form.role)}`);
      setAddOpen(false);
      await fetchMembers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create team member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    const schema = form.password ? createSchema : memberSchema;
    if (!validate(schema)) return;

    setSubmitting(true);
    try {
      await teamApi.update(editing._id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        active: form.active,
        ...(form.password ? { password: form.password } : {}),
      });
      toast.success("Team member updated");
      setEditing(null);
      await fetchMembers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update team member");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(member: TeamMember) {
    const nextActive = !member.active;
    try {
      await teamApi.update(member._id, { active: nextActive });
      toast.success(`${member.name} is now ${nextActive ? "active" : "deactivated"}`);
      await fetchMembers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await teamApi.delete(removing._id);
      toast.success(`${removing.name} removed from the team`);
      setRemoving(null);
      await fetchMembers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to remove team member");
    }
  }

  return (
    <> 
    <SiteHeader />
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Team management
            </h1>
            <p className="text-sm text-muted-foreground">
              Add staff accounts and control what they can access.
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 size-4" />
            Add user
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total members" value={stats.total} icon={Users} />
          <StatCard
            label="Super admins"
            value={stats.superAdmins}
            icon={ShieldCheck}
          />
          <StatCard label="Admins" value={stats.admins} icon={Shield} />
          <StatCard label="Managers" value={stats.managers} icon={UserCog} />
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email or ID"
                  className="pl-9"
                  maxLength={100}
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => setRoleFilter(v as Role | "all")}
              >
                <SelectTrigger className="sm:w-56">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Last login
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Loading team members…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No team members match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((member) => (
                      <TableRow key={member._id}>
                        <TableCell>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {member.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadge(member.role)}>
                            {roleLabel(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={member.active ? "secondary" : "outline"}
                          >
                            {member.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {formatDate(member.createdAt)}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatDate(member.lastLogin)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(member)}>
                                <Pencil className="mr-2 size-4" />
                                Edit user
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleActive(member)}>
                                <ShieldCheck className="mr-2 size-4" />
                                {member.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRemoving(member)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add user */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Create a staff account and assign a role.
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            form={form}
            setForm={setForm}
            errors={errors}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            requirePassword
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
            <DialogDescription>
              Update details or change the assigned role.
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            form={form}
            setForm={setForm}
            errors={errors}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            requirePassword={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This revokes their admin access immediately. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function MemberForm({
  form,
  setForm,
  errors,
  showPassword,
  setShowPassword,
  requirePassword,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  requirePassword: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="member-name">Name</Label>
        <Input
          id="member-name"
          value={form.name}
          maxLength={80}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Full name"
        />
        {errors["name"] && (
          <p className="text-xs text-destructive">{errors["name"]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="member-email">Email</Label>
        <Input
          id="member-email"
          type="email"
          value={form.email}
          maxLength={255}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="name@appleitzone.com"
        />
        {errors["email"] && (
          <p className="text-xs text-destructive">{errors["email"]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="member-password">
          Password{" "}
          {!requirePassword && (
            <span className="text-xs text-muted-foreground">
              (leave blank to keep current)
            </span>
          )}
        </Label>
        <div className="relative">
          <Input
            id="member-password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            maxLength={72}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder="Minimum 8 characters"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors["password"] && (
          <p className="text-xs text-destructive">{errors["password"]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={form.role}
          onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {ROLES.find((r) => r.value === form.role)?.hint}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Account active</p>
          <p className="text-xs text-muted-foreground">
            Inactive users cannot sign in to the admin panel.
          </p>
        </div>
        <Switch
          checked={form.active}
          onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
        />
      </div>
    </div>
  );
}