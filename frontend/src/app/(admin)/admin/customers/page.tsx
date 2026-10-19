"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  Pencil,
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Search,
  Users,
  UserCheck,
  UserX,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { customerApi, userApi, type Customer } from "@/lib/api";
import { useAuth } from "@/store";
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

const statusVariant: Record<string, string> = {
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  inactive: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  suspended: "bg-red-100 text-red-800 hover:bg-red-100",
};

const PAGE_SIZE = 8;

export default function CustomersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const canCreate = user?.role === "admin" || user?.role === "super_admin";

  // ── Create dialog ──────────────────────────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    status: "active",
  });
  const [creating, setCreating] = useState(false);

  const openCreateDialog = () => {
    setCreateForm({ name: "", email: "", phone: "", password: "", status: "active" });
    setCreateDialogOpen(true);
  };

  const handleCreateCustomer = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim() || !createForm.phone.trim()) {
      toast.error("Name, email, phone, and password are required");
      return;
    }
    setCreating(true);
    try {
      await userApi.create({ ...createForm, role: "customer" });
      toast.success("Customer created successfully");
      setCreateDialogOpen(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create customer");
    } finally {
      setCreating(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await customerApi.getAll({
        page,
        limit: PAGE_SIZE,
        search: query || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (data.success) {
        setCustomers(data.customers);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSaveEdit = async () => {
    if (!editForm) return;
    try {
      await userApi.update(editForm._id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        status: editForm.status,
      });
      toast.success(`Customer ${editForm.name} updated`);
      setEditCustomer(null);
      setEditForm(null);
      fetchCustomers();
    } catch {
      toast.error("Failed to update customer");
    }
  };

  const handleToggleStatus = async (customer: Customer, newStatus: string) => {
    try {
      await userApi.update(customer._id, { status: newStatus });
      toast.success(`Customer ${customer.name} marked ${newStatus}`);
      fetchCustomers();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customerApi.remove(deleteTarget._id);
      toast.success(`Customer ${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

  const statCards = [
    { label: "Total Customers", value: total, icon: Users, color: "text-foreground" },
    { label: "Active", value: customers.filter((c) => c.status === "active").length, icon: UserCheck, color: "text-green-600" },
    { label: "Inactive", value: customers.filter((c) => c.status === "inactive").length, icon: UserX, color: "text-gray-600" },
    { label: "Suspended", value: customers.filter((c) => c.status === "suspended").length, icon: Ban, color: "text-red-600" },
  ];

  const formatAddress = (addr: Customer["address"]) => {
    const parts = [addr.street, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

  return (
    <div className="px-4 space-y-6">
      <SiteHeader/>
      <div>
        <h2 className="text-2xl font-bold">Customers</h2>
        <p className="text-muted-foreground">Manage customer accounts and information.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <s.icon className={`h-8 w-8 ${s.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        {canCreate && (
          <Button onClick={openCreateDialog} className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{customer.name}</span>
                      <span className="text-xs text-muted-foreground">{customer.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{customer.phone || "—"}</TableCell>
                  <TableCell>{customer.orderCount}</TableCell>
                  <TableCell>${customer.totalSpent.toFixed(2)}</TableCell>
                  <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={statusVariant[customer.status]} variant="secondary">
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <div>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open actions</span>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewCustomer(customer)}>
                          <Eye className="mr-2 h-4 w-4" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditCustomer(customer); setEditForm(customer); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit customer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {customer.status !== "suspended" ? (
                          <DropdownMenuItem onClick={() => handleToggleStatus(customer, "suspended")}>
                            <Ban className="mr-2 h-4 w-4" /> Suspend customer
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleToggleStatus(customer, "active")}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Activate customer
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {isSuperAdmin && (
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(customer)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete customer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {customers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {(page - 1) * PAGE_SIZE + customers.length} of {total}
        </p>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                .map((p, idx, arr) => (
                  <PaginationItem key={p}>
                    {idx > 0 && p - arr[idx - 1] > 1 ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                      >
                        {p}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Dialog open={!!viewCustomer} onOpenChange={(o) => !o && setViewCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewCustomer?.name}</DialogTitle>
            <DialogDescription>Customer details</DialogDescription>
          </DialogHeader>
          {viewCustomer && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-muted-foreground">{viewCustomer.email}</div>
                </div>
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-muted-foreground">{viewCustomer.phone || "—"}</div>
                </div>
                <div>
                  <div className="font-medium">Joined</div>
                  <div className="text-muted-foreground">{new Date(viewCustomer.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium">Status</div>
                  <Badge className={statusVariant[viewCustomer.status]} variant="secondary">
                    {viewCustomer.status}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="font-medium">Address</div>
                <div className="text-muted-foreground">{formatAddress(viewCustomer.address)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">Total Orders</div>
                  <div className="text-muted-foreground">{viewCustomer.orderCount}</div>
                </div>
                <div>
                  <div className="font-medium">Total Spent</div>
                  <div className="text-muted-foreground">${viewCustomer.totalSpent.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCustomer} onOpenChange={(o) => { if (!o) { setEditCustomer(null); setEditForm(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update information for {editForm?.name}</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v ?? "active" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditCustomer(null); setEditForm(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Customer */}
      <Dialog open={createDialogOpen} onOpenChange={(o) => { if (!o) setCreateDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>Create a new customer account. The customer will be able to log in with the provided credentials.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="create-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="create-name"
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="create-email"
                type="email"
                placeholder="customer@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-phone">Phone <span className="text-destructive">*</span></Label>
              <Input
                id="create-phone"
                type="tel"
                placeholder="+880..."
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Min. 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-status">Status</Label>
              <Select
                value={createForm.status}
                onValueChange={(v) => setCreateForm({ ...createForm, status: v ?? "active" })}
              >
                <SelectTrigger id="create-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={creating}>
              {creating ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure to delete?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete customer &quot;{deleteTarget?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
