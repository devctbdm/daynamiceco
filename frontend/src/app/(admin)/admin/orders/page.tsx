'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Pencil,
  XCircle,
  MoreHorizontal,
  Search,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  Download,
  Printer,
  Clock,
  Truck,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';
import {
  orderApi,
  paymentApi,
  type Order,
  type OrderStatus,
} from '@/lib/api';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  paymentMethodLabel,
} from '@/components/admin/orders/OrderStatusBadge';

type StatusFilter = OrderStatus | 'all';

const PAGE_SIZE = 8;

const shortId = (id: string) => `#${id.slice(-8).toUpperCase()}`;
const orderNo = (o: Order) => o.orderNumber || shortId(o._id);
const formatAmount = (n: number) => `৳${n.toLocaleString()}`;
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const getCustomer = (o: Order) => (typeof o.user === 'object' ? o.user : null);
const formatAddress = (a: Order['shippingAddress']) =>
  [a.street, a.city, a.state, a.postcode, a.country].filter(Boolean).join(', ');

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    processing: number;
    confirmed: number;
    send_courier: number;
    cancelled: number;
  } | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('processing');
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [advanceAmountDraft, setAdvanceAmountDraft] = useState('');
  const [advancePaidDraft, setAdvancePaidDraft] = useState('');
  const [advanceRefDraft, setAdvanceRefDraft] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await orderApi.getAllOrders({
        page,
        limit: PAGE_SIZE,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedQuery || undefined,
      });
      if (data.success) {
        setOrders(data.orders);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedQuery]);

  // Re-query the real transaction status from SSLCommerz and sync it onto the order.
  const syncPayment = async (order: Order) => {
    const tranId = order.payment?.tran_id;
    if (!tranId) {
      toast.error('No gateway transaction for this order');
      return;
    }
    try {
      setSyncingId(order._id);
      const res = await paymentApi.queryTransaction(tranId);
      if (res.data.paymentStatus) {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === order._id
              ? {
                  ...o,
                  payment: { ...o.payment, status: res.data.paymentStatus as Order['payment']['status'] },
                  advancePaid: res.data.advancePaid ?? o.advancePaid,
                }
              : o
          )
        );
        if (viewOrder?._id === order._id) {
          setViewOrder((prev) =>
            prev
              ? {
                  ...prev,
                  payment: { ...prev.payment, status: res.data.paymentStatus as Order['payment']['status'] },
                  advancePaid: res.data.advancePaid ?? prev.advancePaid,
                }
              : prev
          );
        }
      }
      toast.success(
        res.data.updated
          ? `Synced: payment is ${res.data.paymentStatus}`
          : `Gateway status: ${res.data.gatewayStatus || res.data.paymentStatus} (no change)`
      );
    } catch {
      toast.error('Failed to query SSLCommerz');
    } finally {
      setSyncingId(null);
    }
  };

  const fetchStats = useCallback(async () => {    try {
      const { data } = await orderApi.getStats();
      if (data.success) setStats(data.stats);
    } catch {
      // stats are best-effort
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currentPage = Math.min(page, totalPages);

  const handleSaveStatus = async () => {
    if (!editOrder) return;
    try {
      await orderApi.updateStatus(editOrder._id, editStatus);
      toast.success(
        `Order ${orderNo(editOrder)} status updated to ${editStatus}`
      );
      setEditOrder(null);
      fetchOrders();
      fetchStats();
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const handleCancel = async () => {
    if (!cancelOrder) return;
    try {
      await orderApi.updateStatus(cancelOrder._id, 'cancelled');
      toast.success(`Order ${orderNo(cancelOrder)} cancelled`);
      setCancelOrder(null);
      fetchOrders();
      fetchStats();
    } catch {
      toast.error('Failed to cancel order');
    }
  };

  const handleSaveAdvanceAmount = async () => {
    if (!viewOrder) return;
    try {
      const amt = Number(advanceAmountDraft) || 0;
      const { data } = await orderApi.updateAdvance(viewOrder._id, {
        advanceAmount: amt,
      });
      if (data.success) {
        setViewOrder({ ...viewOrder, advanceAmount: amt });
        toast.success('Advance amount updated');
        fetchOrders();
      }
    } catch {
      toast.error('Failed to update advance amount');
    }
  };

  const handleRecordAdvance = async () => {
    if (!viewOrder) return;
    try {
      const paid = Number(advancePaidDraft) || 0;
      const { data } = await orderApi.updateAdvance(viewOrder._id, {
        advancePaid: paid,
        advanceReference: advanceRefDraft,
      });
      if (data.success) {
        setViewOrder({
          ...viewOrder,
          advancePaid: paid,
          advanceReference: advanceRefDraft,
        });
        toast.success('Advance payment recorded');
        fetchOrders();
      }
    } catch {
      toast.error('Failed to record advance payment');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Order ID',
      'Customer',
      'Email',
      'Date',
      'Total',
      'Status',
      'Payment',
      'Shipping Address',
      'Items',
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = orders.map((o) => {
      const cust = getCustomer(o);
      return [
        orderNo(o),
        cust?.name || '',
        cust?.email || '',
        formatDate(o.createdAt),
        o.totalAmount,
        o.orderStatus,
        `${paymentMethodLabel(o.payment.method)} (${o.payment.status})`,
        formatAddress(o.shippingAddress),
        o.items
          .map(
            (it) => `${it.quantity}x ${it.name} @৳${it.price.toLocaleString()}`
          )
          .join('; '),
      ]
        .map((v) => escape(String(v)))
        .join(',');
    });
    const csv = [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${orders.length} orders to CSV`);
  };

  const handlePrintInvoice = (order: Order) => {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      toast.error('Please allow popups to print invoices.');
      return;
    }
    const cust = getCustomer(order);
    const itemsSubtotal = order.items.reduce(
      (s, it) => s + it.price * it.quantity,
      0
    );
    const itemsRows = order.items
      .map(
        (it) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${it.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">৳${it.price.toLocaleString()}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">৳${(
              it.price * it.quantity
            ).toLocaleString()}</td>
          </tr>`
      )
      .join('');
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${orderNo(order)}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #111; padding: 32px; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .muted { color: #666; font-size: 12px; }
            .row { display: flex; justify-content: space-between; margin-top: 24px; gap: 24px; }
            .box { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #111; font-size: 12px; text-transform: uppercase; }
            .total { text-align: right; font-size: 18px; font-weight: 700; margin-top: 16px; }
            .footer { margin-top: 32px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Invoice</h1>
          <div class="muted">Order ${orderNo(order)} · ${formatDate(order.createdAt)}</div>
          <div class="row">
            <div class="box">
              <div class="muted">Billed to</div>
              <div><strong>${cust?.name || ''}</strong></div>
              <div>${cust?.email || ''}</div>
              <div>${formatAddress(order.shippingAddress)}</div>
            </div>
            <div class="box" style="text-align:right;">
              <div class="muted">Payment</div>
              <div>${paymentMethodLabel(order.payment.method)}</div>
              <div class="muted" style="margin-top:8px;">Status</div>
              <div style="text-transform:capitalize;">${order.orderStatus}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div style="text-align:right; margin-top:16px;">
            <div class="muted">Subtotal: ৳${itemsSubtotal.toLocaleString()}</div>
            ${
              order.coupon && order.coupon.discount > 0
                ? `<div class="muted">Coupon (${order.coupon.code}): -৳${order.coupon.discount.toLocaleString()}</div>`
                : ''
            }
            <div class="total" style="margin-top:4px;">Total: ৳${order.totalAmount.toLocaleString()}</div>
          </div>
          <div class="footer">Thank you for your order.</div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const statCards = [
    {
      label: 'Total Orders',
      value: stats?.total ?? total,
      icon: ShoppingBag,
      color: 'text-foreground',
    },
    {
      label: 'Pending',
      value: stats?.pending ?? 0,
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      label: 'Processing',
      value: stats?.processing ?? 0,
      icon: Loader2,
      color: 'text-blue-600',
    },
    {
      label: 'Confirmed',
      value: stats?.confirmed ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
    },
    {
      label: 'Send To Courier',
      value: stats?.send_courier ?? 0,
      icon: Truck,
      color: 'text-violet-600',
    },
    {
      label: 'Cancelled',
      value: stats?.cancelled ?? 0,
      icon: XCircle,
      color: 'text-red-600',
    },
  ];

  return (
    <div>
      <SiteHeader />
      <div className="px-4 py-8">
        {/* Stats */}
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

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
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
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="send_courier">Send To Courier</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => router.push('/admin/orders/new')} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
              ) : (
                orders.map((order) => {
                  const cust = getCustomer(order);
                  return (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium">
                        <button
                          className="hover:underline text-left"
                          onClick={() => router.push(`/admin/orders/${order._id}`)}
                        >
                          {orderNo(order)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{cust?.name || '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {cust?.email || ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{formatAmount(order.totalAmount)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <PaymentStatusBadge status={order.payment.status} />
                          <span className="text-xs text-muted-foreground">
                            {paymentMethodLabel(order.payment.method)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatAmount(
                          order.totalAmount - (order.advancePaid || 0)
                        )}
                        {order.advancePaid ? (
                          <span className="block text-xs text-muted-foreground">
                            adv. {formatAmount(order.advancePaid || 0)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.orderStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <div className="flex items-center gap-2">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open actions</span>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                router.push(`/admin/orders/${order._id}`);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditOrder(order);
                                setEditStatus(order.orderStatus);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePrintInvoice(order)}
                            >
                              <Printer className="mr-2 h-4 w-4" /> Print invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={order.orderStatus === 'cancelled'}
                              onClick={() => setCancelOrder(order)}
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Cancel order
                            </DropdownMenuItem>
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
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            {orders.length === 0
              ? 0
              : (currentPage - 1) * PAGE_SIZE + 1}
            –{(currentPage - 1) * PAGE_SIZE + orders.length} of {total}
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
                    className={
                      currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      (p >= currentPage - 1 && p <= currentPage + 1)
                  )
                  .map((p, idx, arr) => (
                    <PaginationItem key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={p === currentPage}
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
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>

        {/* View details dialog */}
        {viewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-150 rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Order {orderNo(viewOrder)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Placed on {formatDate(viewOrder.createdAt)}
                </p>
              </div>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium">Customer</div>
                    <div className="text-muted-foreground">
                      {getCustomer(viewOrder)?.name || '—'}
                    </div>
                    <div className="text-muted-foreground">
                      {getCustomer(viewOrder)?.email || ''}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Status</div>
                    <OrderStatusBadge status={viewOrder.orderStatus} />
                  </div>
                </div>
                <div>
                  <div className="font-medium">Shipping Address</div>
                  <div className="text-muted-foreground">
                    {formatAddress(viewOrder.shippingAddress)}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Payment</div>
                  <div className="text-muted-foreground">
                    {paymentMethodLabel(viewOrder.payment.method)}
                  </div>
                  <PaymentStatusBadge status={viewOrder.payment.status} />
                  {viewOrder.payment.tran_id ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      disabled={syncingId === viewOrder._id}
                      onClick={() => syncPayment(viewOrder)}
                    >
                      {syncingId === viewOrder._id
                        ? 'Syncing…'
                        : 'Sync from SSLCommerz'}
                    </Button>
                  ) : (
                    <div className="mt-1 text-xs text-muted-foreground">
                      No gateway transaction (e.g. COD)
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    Advance confirmation (COD verify)
                  </div>
                  <div className="text-muted-foreground">
                    Required:{' '}
                    {formatAmount(viewOrder.advanceAmount || 0)} · Received:{' '}
                    {formatAmount(viewOrder.advancePaid || 0)} · Due on
                    delivery:{' '}
                    {formatAmount(
                      viewOrder.totalAmount - (viewOrder.advancePaid || 0)
                    )}
                  </div>
                  {viewOrder.advanceReference ? (
                    <div className="text-xs text-muted-foreground">
                      Ref: {viewOrder.advanceReference}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={advanceAmountDraft}
                      onChange={(e) => setAdvanceAmountDraft(e.target.value)}
                      placeholder="Set required amount"
                      className="w-44"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveAdvanceAmount}
                    >
                      Save amount
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={advancePaidDraft}
                      onChange={(e) => setAdvancePaidDraft(e.target.value)}
                      placeholder="Mark received"
                      className="w-36"
                    />
                    <Input
                      value={advanceRefDraft}
                      onChange={(e) => setAdvanceRefDraft(e.target.value)}
                      placeholder="bKash ref (trxid)"
                      className="w-44"
                    />
                    <Button size="sm" onClick={handleRecordAdvance}>
                      Record received
                    </Button>
                  </div>
                </div>
                {viewOrder.note ? (
                  <div>
                    <div className="font-medium">Note</div>
                    <div className="text-muted-foreground">
                      {viewOrder.note}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="mb-2 font-medium">Items</div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewOrder.items.map((it, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{it.name}</TableCell>
                            <TableCell className="text-center">
                              {it.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatAmount(it.price * it.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>
                        Subtotal ({viewOrder.items.length}{' '}
                        item{viewOrder.items.length === 1 ? '' : 's'})
                      </span>
                      <span>
                        {formatAmount(
                          viewOrder.items.reduce(
                            (sum, it) => sum + it.price * it.quantity,
                            0
                          )
                        )}
                      </span>
                    </div>
                    {viewOrder.coupon && viewOrder.coupon.discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Coupon ({viewOrder.coupon.code})
                        </span>
                        <span className="font-medium text-green-600">
                          -{formatAmount(viewOrder.coupon.discount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-1 font-semibold">
                      <span>Total</span>
                      <span>{formatAmount(viewOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-start gap-2">
                <Button variant="outline" onClick={() => setViewOrder(null)}>
                  Close
                </Button>
                <Button onClick={() => handlePrintInvoice(viewOrder)}>
                  <Printer className="mr-2 h-4 w-4" /> Print invoice
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit status dialog */}
        <Dialog
          open={!!editOrder}
          onOpenChange={(o) => !o && setEditOrder(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Order Status</DialogTitle>
              <DialogDescription>
                Update status for {editOrder ? orderNo(editOrder) : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="send_courier">Send To Courier</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-3 flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEditOrder(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStatus}>Save status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel confirm */}
        <AlertDialog
          open={!!cancelOrder}
          onOpenChange={(o) => !o && setCancelOrder(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
              <AlertDialogDescription>
                Order {cancelOrder ? orderNo(cancelOrder) : ''} will be
                marked as cancelled. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep order</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>
                Cancel order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
