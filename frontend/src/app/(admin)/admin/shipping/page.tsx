// src/app/(admin)/shipping/page.tsx
"use client";

import { useState, useMemo } from "react";
import { formatBDT } from "@/utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Truck,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  Save,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ------------------------------------------------------------
// DUMMY SHIPPING DATA
// ------------------------------------------------------------
const initialShippingMethods = [
  {
    id: "ship_001",
    name: "Standard Delivery",
    description: "Regular delivery within 3-5 business days",
    price: 150,
    estimatedDays: "3-5",
    zone: "Dhaka",
    isActive: true,
    isDefault: true,
    carrier: "Pathao",
    trackingAvailable: true,
  },
  {
    id: "ship_002",
    name: "Express Delivery",
    description: "Fast delivery within 24 hours",
    price: 350,
    estimatedDays: "1",
    zone: "Dhaka",
    isActive: true,
    isDefault: false,
    carrier: "RedX",
    trackingAvailable: true,
  },
  {
    id: "ship_003",
    name: "Outside Dhaka - Standard",
    description: "Delivery to other districts within 5-7 days",
    price: 250,
    estimatedDays: "5-7",
    zone: "Outside Dhaka",
    isActive: true,
    isDefault: true,
    carrier: "Sundarban Courier",
    trackingAvailable: true,
  },
  {
    id: "ship_004",
    name: "Outside Dhaka - Express",
    description: "Fast delivery to other districts within 2-3 days",
    price: 450,
    estimatedDays: "2-3",
    zone: "Outside Dhaka",
    isActive: false,
    isDefault: false,
    carrier: "SA Paribahan",
    trackingAvailable: true,
  },
  {
    id: "ship_005",
    name: "Cash on Delivery",
    description: "Pay when you receive the package",
    price: 0,
    estimatedDays: "3-5",
    zone: "All Zones",
    isActive: true,
    isDefault: false,
    carrier: "N/A",
    trackingAvailable: false,
  },
  {
    id: "ship_006",
    name: "International Shipping",
    description: "Shipping to international destinations",
    price: 1500,
    estimatedDays: "10-15",
    zone: "International",
    isActive: false,
    isDefault: false,
    carrier: "DHL",
    trackingAvailable: true,
  },
  {
    id: "ship_007",
    name: "Next Day Delivery",
    description: "Guaranteed next business day delivery",
    price: 500,
    estimatedDays: "1",
    zone: "Dhaka",
    isActive: true,
    isDefault: false,
    carrier: "RedX Premium",
    trackingAvailable: true,
  },
  {
    id: "ship_008",
    name: "Free Shipping",
    description: "Free shipping for orders above 5000 BDT",
    price: 0,
    estimatedDays: "4-6",
    zone: "All Zones",
    isActive: true,
    isDefault: false,
    carrier: "Multiple",
    trackingAvailable: false,
  },
];

// ------------------------------------------------------------
// ZONES FOR FILTER
// ------------------------------------------------------------
const zones = ["All", "Dhaka", "Outside Dhaka", "All Zones", "International"];

// ------------------------------------------------------------
// SHIPPING STATUS CONFIG
// ------------------------------------------------------------
const statusConfig = {
  active: {
    label: "Active",
    variant: "default" as const,
    icon: <CheckCircle className="h-3 w-3" />,
  },
  inactive: {
    label: "Inactive",
    variant: "secondary" as const,
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ------------------------------------------------------------
// MAIN SHIPPING PAGE
// ------------------------------------------------------------
export default function ShippingPage() {
  const [shippingMethods, setShippingMethods] = useState(
    initialShippingMethods,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dialog states
  const [selectedMethod, setSelectedMethod] = useState<
    (typeof initialShippingMethods)[0] | null
  >(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Edit/Create form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    estimatedDays: "",
    zone: "Dhaka",
    isActive: true,
    isDefault: false,
    carrier: "",
    trackingAvailable: false,
  });

  // Stats
  const totalMethods = shippingMethods.length;
  const activeMethods = shippingMethods.filter((m) => m.isActive).length;
  const defaultMethods = shippingMethods.filter((m) => m.isDefault).length;
  const freeMethods = shippingMethods.filter((m) => m.price === 0).length;

  // Filter
  const filteredMethods = useMemo(() => {
    return shippingMethods.filter((method) => {
      if (zoneFilter !== "All" && method.zone !== zoneFilter) return false;
      if (statusFilter === "active" && !method.isActive) return false;
      if (statusFilter === "inactive" && method.isActive) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          method.name.toLowerCase().includes(search) ||
          method.description.toLowerCase().includes(search) ||
          method.carrier.toLowerCase().includes(search) ||
          method.zone.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [shippingMethods, searchTerm, zoneFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredMethods.length / itemsPerPage);
  const paginatedMethods = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMethods.slice(start, start + itemsPerPage);
  }, [filteredMethods, currentPage]);

  // Helpers
  const renderStatusBadge = (isActive: boolean) => {
    const config = isActive ? statusConfig.active : statusConfig.inactive;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const renderDefaultBadge = (isDefault: boolean) => {
    if (isDefault) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          Default
        </Badge>
      );
    }
    return null;
  };

  // Actions
  const handleView = (method: (typeof initialShippingMethods)[0]) => {
    setSelectedMethod(method);
    setIsViewOpen(true);
  };

  const handleEdit = (method: (typeof initialShippingMethods)[0]) => {
    setSelectedMethod(method);
    setFormData({
      name: method.name,
      description: method.description,
      price: method.price,
      estimatedDays: method.estimatedDays,
      zone: method.zone,
      isActive: method.isActive,
      isDefault: method.isDefault,
      carrier: method.carrier,
      trackingAvailable: method.trackingAvailable,
    });
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      estimatedDays: "",
      zone: "Dhaka",
      isActive: true,
      isDefault: false,
      carrier: "",
      trackingAvailable: false,
    });
    setIsCreateOpen(true);
  };

  const handleSave = (isCreate: boolean) => {
    if (isCreate) {
      const newMethod = {
        id: `ship_${Date.now()}`,
        ...formData,
      };
      setShippingMethods((prev) => [...prev, newMethod]);
      toast.success("Shipping method created successfully");
      setIsCreateOpen(false);
    } else {
      if (!selectedMethod) return;
      setShippingMethods((prev) =>
        prev.map((m) =>
          m.id === selectedMethod.id ? { ...m, ...formData } : m,
        ),
      );
      toast.success("Shipping method updated successfully");
      setIsEditOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteMethodId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteMethodId) return;
    setShippingMethods((prev) => prev.filter((m) => m.id !== deleteMethodId));
    toast.success("Shipping method deleted successfully");
    setIsDeleteOpen(false);
    setDeleteMethodId(null);
  };

  const handleToggleStatus = (id: string) => {
    setShippingMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)),
    );
    const method = shippingMethods.find((m) => m.id === id);
    toast.success(
      `${method?.name} ${method?.isActive ? "deactivated" : "activated"}`,
    );
  };

  const handleSetDefault = (id: string) => {
    setShippingMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
      })),
    );
    const method = shippingMethods.find((m) => m.id === id);
    toast.success(`${method?.name} set as default shipping method`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Shipping</h1>
          <p className="text-sm text-muted-foreground">
            Manage shipping methods, rates, and zones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => toast.info("Refreshing...")}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Shipping Method
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Methods</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMethods}</div>
            <p className="text-xs text-muted-foreground">
              Shipping options available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeMethods}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {defaultMethods}
            </div>
            <p className="text-xs text-muted-foreground">
              Default shipping method
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Shipping</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {freeMethods}
            </div>
            <p className="text-xs text-muted-foreground">
              Free shipping options
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, description, carrier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={zoneFilter} onValueChange={(val) => setZoneFilter(val || "All")}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as any)}
          >
            <SelectTrigger className="w-full sm:w-35">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredMethods.length} method
          {filteredMethods.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Shipping Methods Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="hidden md:table-cell">Zone</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden lg:table-cell">Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMethods.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No shipping methods found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-50">
                          {method.description}
                        </p>
                        <p className="text-xs text-muted-foreground block md:hidden">
                          {method.zone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        {method.zone}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {method.price === 0 ? "Free" : formatBDT(method.price)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {method.estimatedDays} days
                      </span>
                    </TableCell>
                    <TableCell>{renderStatusBadge(method.isActive)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {renderDefaultBadge(method.isDefault)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger >
                          <div>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleView(method)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(method)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(method.id)}
                          >
                            {method.isActive ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />{" "}
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(method.id)}
                          >
                            <Star className="mr-2 h-4 w-4" /> Set as Default
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(method.id)}
                            className="text-red-600 focus:text-red-700"
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredMethods.length)} of{" "}
            {filteredMethods.length} methods
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------
          VIEW DETAIL DIALOG
          ------------------------------------------------------------ */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          {selectedMethod && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl">
                    {selectedMethod.name}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    {renderDefaultBadge(selectedMethod.isDefault)}
                    {renderStatusBadge(selectedMethod.isActive)}
                  </div>
                </div>
                <DialogDescription>
                  {selectedMethod.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-xl font-bold">
                      {selectedMethod.price === 0
                        ? "Free"
                        : formatBDT(selectedMethod.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Delivery Time
                    </p>
                    <p className="text-xl font-bold">
                      {selectedMethod.estimatedDays} days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Zone</p>
                    <p className="font-medium">{selectedMethod.zone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Carrier</p>
                    <p className="font-medium">{selectedMethod.carrier}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Tracking Available
                    </p>
                    <p className="font-medium">
                      {selectedMethod.trackingAvailable ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsViewOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setIsViewOpen(false);
                      handleEdit(selectedMethod);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------
          CREATE/EDIT DIALOG
          ------------------------------------------------------------ */}
      <Dialog
        open={isEditOpen || isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditOpen(false);
            setIsCreateOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>
              {isCreateOpen ? "Add Shipping Method" : "Edit Shipping Method"}
            </DialogTitle>
            <DialogDescription>
              {isCreateOpen
                ? "Create a new shipping method for your store"
                : "Update shipping method details"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Method Name</label>
              <Input
                placeholder="e.g., Standard Delivery"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of this shipping method"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Price (BDT)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estimated Days</label>
                <Input
                  placeholder="e.g., 3-5"
                  value={formData.estimatedDays}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedDays: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Zone</label>
                <Select
                  value={formData.zone}
                  onValueChange={(val) =>
                    setFormData({ ...formData, zone: val || "Dhaka" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dhaka">Dhaka</SelectItem>
                    <SelectItem value="Outside Dhaka">Outside Dhaka</SelectItem>
                    <SelectItem value="All Zones">All Zones</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Carrier</label>
                <Input
                  placeholder="e.g., Pathao, RedX"
                  value={formData.carrier}
                  onChange={(e) =>
                    setFormData({ ...formData, carrier: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                />
                Set as Default
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.trackingAvailable}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trackingAvailable: e.target.checked,
                    })
                  }
                />
                Tracking Available
              </label>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setIsCreateOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSave(isCreateOpen)}>
                <Save className="mr-2 h-4 w-4" />
                {isCreateOpen ? "Create Method" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------
          DELETE CONFIRMATION DIALOG
          ------------------------------------------------------------ */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this shipping method? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------
// STAR ICON FOR DEFAULT BADGE
// ------------------------------------------------------------
function Star({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
        clipRule="evenodd"
      />
    </svg>
  );
}
