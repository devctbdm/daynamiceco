"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  TicketPercent,
  CheckCircle2,
  PauseCircle,
  Eye,
  Pencil,
  MoreHorizontal,
  Trash2,
  Plus,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { CategoryMultiSelect } from "@/components/admin/products/CategoryMultiSelect";
import {
  promoApi,
  categoryApi,
  type PromoCode,
  type PromoStats,
  type PromoFormData,
  type Category,
} from "@/lib/api";

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  inactive: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

const typeBadge: Record<string, string> = {
  percentage: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  fixed: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  free_shipping: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

const PAGE_SIZE = 10;

type PromoFormState = {
  code: string;
  description: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: string;
  minOrder: string;
  maxDiscount: string;
  maxUses: string;
  perUserLimit: string;
  startDate: string;
  endDate: string;
  status: "active" | "inactive";
  categories: string[];
  applyToAll: boolean;
};

const emptyForm: PromoFormState = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  minOrder: "",
  maxDiscount: "",
  maxUses: "",
  perUserLimit: "1",
  startDate: "",
  endDate: "",
  status: "active",
  categories: [],
  applyToAll: true,
};

function toLocalInput(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatValue(p: PromoCode) {
  if (p.type === "percentage") return `${p.value}%`;
  if (p.type === "fixed") return `৳${p.value.toLocaleString()}`;
  return "Free shipping";
}

function formatValidity(p: PromoCode) {
  if (!p.startDate && !p.endDate) return "Always";
  const f = (d: string) =>
    new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (p.startDate && p.endDate) return `${f(p.startDate)} – ${f(p.endDate)}`;
  if (p.startDate) return `From ${f(p.startDate)}`;
  if (p.endDate) return `Until ${f(p.endDate)}`;
  return "Always";
}

export default function PromoPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewPromo, setViewPromo] = useState<PromoCode | null>(null);
  const [deletePromo, setDeletePromo] = useState<PromoCode | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchPromos = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await promoApi.getAll({
        page,
        limit: PAGE_SIZE,
        search: query || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
      });
      if (data.success) {
        setPromos(data.promos);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch {
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter, typeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await promoApi.getStats();
      if (data.success) setStats(data.stats);
    } catch {
      // stats are best-effort
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    categoryApi
      .getAll()
      .then(({ data }) => {
        if (data.success) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditing(p);
    const cats = (p.categories || []).map(String);
    setForm({
      code: p.code,
      description: p.description,
      type: p.type,
      value: String(p.value),
      minOrder: String(p.minOrder),
      maxDiscount: String(p.maxDiscount),
      maxUses: String(p.maxUses),
      perUserLimit: String(p.perUserLimit),
      startDate: toLocalInput(p.startDate),
      endDate: toLocalInput(p.endDate),
      status: p.status,
      categories: cats,
      applyToAll: cats.length === 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: PromoFormData = {
      code: form.code.trim(),
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value) || 0,
      minOrder: Number(form.minOrder) || 0,
      maxDiscount: Number(form.maxDiscount) || 0,
      maxUses: Number(form.maxUses) || 0,
      perUserLimit: Number(form.perUserLimit) || 1,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      status: form.status,
      categories: form.applyToAll ? [] : form.categories,
    };

    if (!payload.code) {
      toast.error("Promo code is required");
      return;
    }
    if (payload.type === "percentage" && (payload.value <= 0 || payload.value > 100)) {
      toast.error("Percentage value must be greater than 0 and at most 100");
      return;
    }
    if (payload.type === "fixed" && payload.value <= 0) {
      toast.error("Discount amount must be greater than 0");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await promoApi.update(editing._id, payload);
        toast.success("Promo code updated");
      } else {
        await promoApi.create(payload);
        toast.success("Promo code created");
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchPromos();
      fetchStats();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to save promo code"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p: PromoCode) => {
    try {
      const next = p.status === "active" ? "inactive" : "active";
      await promoApi.update(p._id, { status: next });
      toast.success(`Promo ${p.code} ${next}`);
      fetchPromos();
      fetchStats();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deletePromo) return;
    try {
      await promoApi.delete(deletePromo._id);
      toast.success(`Promo ${deletePromo.code} deleted`);
      setDeletePromo(null);
      fetchPromos();
      fetchStats();
    } catch {
      toast.error("Failed to delete promo code");
    }
  };

  const statCards = [
    {
      label: "Total Promo Codes",
      value: stats?.total ?? 0,
      icon: <TicketPercent className="h-8 w-8 text-foreground" />,
    },
    {
      label: "Active",
      value: stats?.active ?? 0,
      icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
    },
    {
      label: "Inactive",
      value: stats?.inactive ?? 0,
      icon: <PauseCircle className="h-8 w-8 text-gray-600" />,
    },
    {
      label: "Expiring Soon",
      value: stats?.expiringSoon ?? 0,
      icon: <Flame className="h-8 w-8 text-orange-500" />,
    },
  ];

  const valueLabel =
    form.type === "percentage"
      ? "Discount (%)"
      : form.type === "fixed"
        ? "Discount amount (৳)"
        : "Discount value";

  return (
    <div className="px-4 space-y-6">
      <SiteHeader
        title="Promo Codes"
        description="Create and manage discount codes, percentage offers and free-shipping campaigns."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code or description..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="fixed">Fixed amount</SelectItem>
            <SelectItem value="free_shipping">Free shipping</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Create promo code
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : promos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No promo codes found.
                </TableCell>
              </TableRow>
            ) : (
              promos.map((promo) => (
                <TableRow key={promo._id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono uppercase">
                      {promo.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {promo.description || "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={typeBadge[promo.type]}
                      variant="secondary"
                    >
                      {promo.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {formatValue(promo)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {promo.usageCount}
                    {promo.maxUses > 0 ? ` / ${promo.maxUses}` : " / ∞"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {promo.minOrder > 0
                      ? `৳${promo.minOrder.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatValidity(promo)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusBadge[promo.status]}
                      variant="secondary"
                    >
                      {promo.status}
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
                        <DropdownMenuItem onClick={() => setViewPromo(promo)}>
                          <Eye className="mr-2 h-4 w-4" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(promo)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit promo code
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(promo)}>
                          {promo.status === "active" ? (
                            <>
                              <PauseCircle className="mr-2 h-4 w-4" /> Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletePromo(promo)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      {/* Pagination */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {promos.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {(page - 1) * PAGE_SIZE + promos.length} of {total}
        </p>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 1 && p <= page + 1)
                )
                .map((p, idx, arr) => (
                  <PaginationItem key={p}>
                    {idx > 0 && p - arr[idx - 1] > 1 ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit promo code" : "Create promo code"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Update details for ${editing.code}`
                : "Add a new discount code or campaign"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. SUMMER10"
                className="font-mono uppercase"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional short description"
                rows={2}
              />
            </div>

            {/* Category scope */}
            <div className="grid gap-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">Applies to all categories</Label>
                  <p className="text-xs text-muted-foreground">
                    When on, this promo works on every product. Turn off to limit it
                    to specific categories.
                  </p>
                </div>
                <Switch
                  checked={form.applyToAll}
                  onCheckedChange={(v) => setForm({ ...form, applyToAll: v })}
                />
              </div>

              {!form.applyToAll && (
                <div className="space-y-1.5">
                  <Label>Restrict to categories</Label>
                  <CategoryMultiSelect
                    categories={categories}
                    value={form.categories}
                    onChange={(cats) => setForm({ ...form, categories: cats })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The discount applies only to items in the selected categories.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Discount type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: (v || "percentage") as PromoFormState["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="free_shipping">Free shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{valueLabel}</Label>
                <Input
                  type="number"
                  min={0}
                  max={form.type === "percentage" ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "percentage" ? "10" : form.type === "fixed" ? "500" : "0"}
                  disabled={form.type === "free_shipping"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Minimum order (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Max discount (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="0"
                  disabled={form.type !== "percentage"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Max total uses</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="0 = unlimited"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Per-user limit</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.perUserLimit}
                  onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="startDate">Starts on</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="endDate">Ends on</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: (v || "active") as "active" | "inactive" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create promo code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View details */}
      <Dialog open={!!viewPromo} onOpenChange={(o) => !o && setViewPromo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Badge variant="secondary" className="font-mono uppercase">
                {viewPromo?.code}
              </Badge>
            </DialogTitle>
            <DialogDescription>Promo code details</DialogDescription>
          </DialogHeader>
          {viewPromo && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Description</div>
                <div className="text-muted-foreground">
                  {viewPromo.description || "—"}
                </div>
              </div>
              <div>
                <div className="font-medium">Applies to</div>
                <div className="text-muted-foreground">
                  {(viewPromo.categories || []).length === 0 ? (
                    "All categories"
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(viewPromo.categories || []).map((c) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium">Type</div>
                  <Badge
                    className={typeBadge[viewPromo.type]}
                    variant="secondary"
                  >
                    {viewPromo.type.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium">Value</div>
                  <div className="text-muted-foreground">
                    {formatValue(viewPromo)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Min order</div>
                  <div className="text-muted-foreground">
                    {viewPromo.minOrder > 0
                      ? `৳${viewPromo.minOrder.toLocaleString()}`
                      : "None"}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Max discount</div>
                  <div className="text-muted-foreground">
                    {viewPromo.maxDiscount > 0
                      ? `৳${viewPromo.maxDiscount.toLocaleString()}`
                      : "None"}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Usage</div>
                  <div className="text-muted-foreground">
                    {viewPromo.usageCount}
                    {viewPromo.maxUses > 0 ? ` / ${viewPromo.maxUses}` : " / ∞"}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Per-user limit</div>
                  <div className="text-muted-foreground">
                    {viewPromo.perUserLimit}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Validity</div>
                  <div className="text-muted-foreground">
                    {formatValidity(viewPromo)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Status</div>
                  <Badge
                    className={statusBadge[viewPromo.status]}
                    variant="secondary"
                  >
                    {viewPromo.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPromo(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deletePromo}
        onOpenChange={(o) => !o && setDeletePromo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete promo code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-mono font-medium">{deletePromo?.code}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
