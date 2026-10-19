'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Printer,
  ExternalLink,
  RefreshCw,
  Package,
  MapPin,
  CreditCard,
  FileText,
  Clock,
  User,
  Edit2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';
import { orderApi, paymentApi, type Order, type OrderStatus } from '@/lib/api';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ORDER_STATUS_OPTIONS,
  paymentMethodLabel,
} from '@/components/admin/orders/OrderStatusBadge';
import { useAuth } from '@/store';

// ── Helpers ──────────────────────────────────────────────────────────────────

const orderNo = (o: Order) =>
  o.orderNumber ? `#${o.orderNumber}` : `#${o._id.slice(-8).toUpperCase()}`;

const fmt = (n: number) => `৳${n.toLocaleString()}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtAddr = (a: Order['shippingAddress']) =>
  [a.fullName, a.phone, a.street, a.city, a.state, a.postcode, a.country]
    .filter(Boolean)
    .join(', ');

function getCustomer(o: Order) {
  return typeof o.user === 'object' ? o.user : null;
}

// ── Skeleton loader ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'manager';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Status edit ─────────────────────────────────────────────────────────────
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [savingStatus, setSavingStatus] = useState(false);

  // ── Payment status edit ─────────────────────────────────────────────────────
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editPayStatus, setEditPayStatus] = useState('pending');
  const [savingPay, setSavingPay] = useState(false);

  // ── Advance payment ─────────────────────────────────────────────────────────
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [advanceAmountDraft, setAdvanceAmountDraft] = useState('');
  const [advancePaidDraft, setAdvancePaidDraft] = useState('');
  const [advanceRefDraft, setAdvanceRefDraft] = useState('');
  const [savingAdvance, setSavingAdvance] = useState(false);

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ── SSLCommerz sync ─────────────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await orderApi.getById(id);
      if (data.success) setOrder(data.order);
      else setError('Order not found');
    } catch {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSaveStatus = async () => {
    if (!order) return;
    setSavingStatus(true);
    try {
      const { data } = await orderApi.updateStatus(order._id, editStatus);
      setOrder(data.order);
      setStatusDialogOpen(false);
      toast.success(`Order status updated to ${editStatus}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSavePayStatus = async () => {
    if (!order) return;
    setSavingPay(true);
    try {
      // API expects Capitalised first letter
      const cap = editPayStatus.charAt(0).toUpperCase() + editPayStatus.slice(1);
      const { data } = await orderApi.updatePaymentStatus(order._id, cap as any);
      setOrder(data.order);
      setPayDialogOpen(false);
      toast.success('Payment status updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update payment status');
    } finally {
      setSavingPay(false);
    }
  };

  const handleSaveAdvance = async () => {
    if (!order) return;
    setSavingAdvance(true);
    try {
      const payload: Record<string, any> = {};
      if (advanceAmountDraft !== '') payload.advanceAmount = Number(advanceAmountDraft) || 0;
      if (advancePaidDraft !== '') payload.advancePaid = Number(advancePaidDraft) || 0;
      if (advanceRefDraft !== '') payload.advanceReference = advanceRefDraft;
      const { data } = await orderApi.updateAdvance(order._id, payload);
      setOrder(data.order);
      setAdvanceDialogOpen(false);
      toast.success('Advance payment updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update advance');
    } finally {
      setSavingAdvance(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const { data } = await orderApi.updateStatus(order._id, 'cancelled');
      setOrder(data.order);
      setCancelOpen(false);
      toast.success('Order cancelled — stock restored');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleSyncPayment = async () => {
    if (!order?.payment?.tran_id) return;
    setSyncing(true);
    try {
      const { data } = await paymentApi.queryTransaction(order.payment.tran_id);
      if (data.paymentStatus) {
        setOrder((prev) =>
          prev
            ? { ...prev, payment: { ...prev.payment, status: data.paymentStatus! }, advancePaid: data.advancePaid ?? prev.advancePaid }
            : prev
        );
      }
      toast.success(data.updated ? `Synced: ${data.paymentStatus}` : `Gateway: ${data.gatewayStatus || data.paymentStatus} (no change)`);
    } catch {
      toast.error('Failed to query SSLCommerz');
    } finally {
      setSyncing(false);
    }
  };

  const handlePrint = () => {
    if (!order) return;
    const cust = getCustomer(order);
    const itemsSubtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) { toast.error('Allow popups to print invoices'); return; }
    const rows = order.items.map((it) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${it.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">৳${it.price.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">৳${(it.price * it.quantity).toLocaleString()}</td>
      </tr>`).join('');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Invoice ${orderNo(order)}</title>
      <style>body{font-family:system-ui,sans-serif;color:#111;padding:32px}h1{margin:0 0 4px;font-size:24px}.muted{color:#666;font-size:12px}.row{display:flex;justify-content:space-between;margin-top:24px;gap:24px}.box{flex:1}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}th{text-align:left;padding:8px;border-bottom:2px solid #111;font-size:12px;text-transform:uppercase}.footer{margin-top:32px;font-size:12px;color:#666;text-align:center}</style>
      </head><body>
      <h1>Invoice</h1><div class="muted">Order ${orderNo(order)} · ${fmtDate(order.createdAt)}</div>
      <div class="row">
        <div class="box"><div class="muted">Billed to</div><div><strong>${cust?.name || ''}</strong></div><div>${cust?.email || ''}</div><div>${fmtAddr(order.shippingAddress)}</div></div>
        <div class="box" style="text-align:right"><div class="muted">Payment</div><div>${paymentMethodLabel(order.payment.method)}</div><div class="muted" style="margin-top:8px">Status</div><div style="text-transform:capitalize">${order.orderStatus}</div></div>
      </div>
      <table><thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="text-align:right;margin-top:16px">
        <div class="muted">Subtotal: ৳${itemsSubtotal.toLocaleString()}</div>
        ${order.coupon?.discount ? `<div class="muted">Coupon (${order.coupon.code}): -৳${order.coupon.discount.toLocaleString()}</div>` : ''}
        <div style="font-size:18px;font-weight:700;margin-top:4px">Total: ৳${order.totalAmount.toLocaleString()}</div>
      </div>
      <div class="footer">Thank you for your order.</div>
      <script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const itemsSubtotal = order?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;
  const couponDiscount = order?.coupon?.discount ?? 0;
  const shippingFee = order ? order.totalAmount - itemsSubtotal + couponDiscount : 0;
  const amountDue = order ? order.totalAmount - (order.advancePaid ?? 0) : 0;
  const cust = order ? getCustomer(order) : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {loading ? <Skeleton className="h-7 w-40 inline-block" /> : order ? orderNo(order) : 'Order'}
              </h1>
              {order && (
                <p className="text-sm text-muted-foreground">
                  Placed on {fmtDate(order.createdAt)}
                </p>
              )}
            </div>
          </div>
          {order && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print Invoice
              </Button>
              <Button variant="outline" size="sm" onClick={fetchOrder}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchOrder} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <PageSkeleton />
        ) : order ? (
          <div className="grid gap-6 lg:grid-cols-3">

            {/* ── Left: Items + Shipping + Timeline ──────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Order items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Order Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-6 py-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-14 w-14 rounded-md object-cover shrink-0 border"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmt(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-sm shrink-0">
                          {fmt(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t px-6 py-4 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{fmt(itemsSubtotal)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Coupon ({order.coupon?.code})</span>
                        <span>-{fmt(couponDiscount)}</span>
                      </div>
                    )}
                    {shippingFee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span>+{fmt(shippingFee)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>{fmt(order.totalAmount)}</span>
                    </div>
                    {(order.advancePaid ?? 0) > 0 && (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Advance paid</span>
                          <span>-{fmt(order.advancePaid ?? 0)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-amber-700">
                          <span>Amount due on delivery</span>
                          <span>{fmt(amountDue)}</span>
                        </div>
                      </>
                    )}
                    {order.note && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Note</p>
                        <p className="text-sm text-muted-foreground italic">{order.note}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Shipping address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-y-1 text-sm">
                  {order.shippingAddress.fullName && (
                    <div className="font-medium">{order.shippingAddress.fullName}</div>
                  )}
                  {order.shippingAddress.phone && (
                    <div className="text-muted-foreground">{order.shippingAddress.phone}</div>
                  )}
                  <div className="text-muted-foreground">
                    {[
                      order.shippingAddress.street,
                      order.shippingAddress.city,
                      order.shippingAddress.state,
                      order.shippingAddress.postcode,
                      order.shippingAddress.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative border-l border-muted ml-3 space-y-4">
                    <li className="ml-4">
                      <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />
                      <p className="text-sm font-medium">Order created</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(order.createdAt)}</p>
                    </li>
                    {order.payment.paidAt && (
                      <li className="ml-4">
                        <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                        <p className="text-sm font-medium">Payment confirmed</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(order.payment.paidAt)}</p>
                      </li>
                    )}
                    <li className="ml-4">
                      <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                      <p className="text-sm font-medium">
                        Current status: <span className="capitalize">{order.orderStatus.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Last updated {fmtDate(order.updatedAt)}</p>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>

            {/* ── Right: Customer + Payment + Actions ────────────────────── */}
            <div className="space-y-6">

              {/* Customer */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {cust ? (
                    <>
                      <p className="font-medium">{cust.name}</p>
                      <p className="text-muted-foreground">{cust.email}</p>
                      {cust.phone && <p className="text-muted-foreground">{cust.phone}</p>}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs"
                        onClick={() => router.push('/admin/customers')}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View in customers
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Customer info unavailable</p>
                  )}
                </CardContent>
              </Card>

              {/* Order status */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Order Status</CardTitle>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditStatus(order.orderStatus);
                          setStatusDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <OrderStatusBadge status={order.orderStatus} />
                  {order.orderStatus !== 'cancelled' && canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive border-destructive/30"
                      onClick={() => setCancelOpen(true)}
                    >
                      Cancel Order
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Payment
                    </CardTitle>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditPayStatus(order.payment.status);
                          setPayDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium">{paymentMethodLabel(order.payment.method)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <PaymentStatusBadge status={order.payment.status} />
                  </div>
                  {order.payment.tran_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Trans. ID</span>
                      <span className="font-mono text-xs truncate max-w-[120px]">{order.payment.tran_id}</span>
                    </div>
                  )}
                  {order.payment.tran_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleSyncPayment}
                      disabled={syncing}
                    >
                      <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing…' : 'Sync from SSLCommerz'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* COD Advance */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">COD Advance</CardTitle>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setAdvanceAmountDraft(String(order.advanceAmount ?? 0));
                          setAdvancePaidDraft(String(order.advancePaid ?? 0));
                          setAdvanceRefDraft(order.advanceReference ?? '');
                          setAdvanceDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required</span>
                    <span>{fmt(order.advanceAmount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Received</span>
                    <span className="font-medium">{fmt(order.advancePaid ?? 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Due on delivery</span>
                    <span className={amountDue > 0 ? 'text-amber-700' : 'text-green-700'}>
                      {fmt(amountDue)}
                    </span>
                  </div>
                  {order.advanceReference && (
                    <p className="text-xs text-muted-foreground">Ref: {order.advanceReference}</p>
                  )}
                </CardContent>
              </Card>

              {/* Notes (read-only) */}
              {order.note && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground italic">{order.note}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Edit Order Status Dialog ──────────────────────────────────────── */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the fulfilment status for {order ? orderNo(order) : 'this order'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Status</Label>
            <Select value={editStatus} onValueChange={(v) => setEditStatus(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editStatus === 'cancelled' && (
              <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Stock will be restored for all items.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStatus} disabled={savingStatus}>
              {savingStatus ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Payment Status Dialog ────────────────────────────────────── */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Manually override the payment status for this order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Payment status</Label>
            <Select value={editPayStatus} onValueChange={setEditPayStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayStatus} disabled={savingPay}>
              {savingPay ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Advance Payment Dialog ────────────────────────────────────────── */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>COD Advance Payment</DialogTitle>
            <DialogDescription>
              Set the required advance and record what has been received.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="adv-required">Required advance (৳)</Label>
              <Input
                id="adv-required"
                type="number"
                min={0}
                value={advanceAmountDraft}
                onChange={(e) => setAdvanceAmountDraft(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adv-paid">Amount received (৳)</Label>
              <Input
                id="adv-paid"
                type="number"
                min={0}
                value={advancePaidDraft}
                onChange={(e) => setAdvancePaidDraft(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adv-ref">Reference (bKash/Nagad TrxID)</Label>
              <Input
                id="adv-ref"
                value={advanceRefDraft}
                onChange={(e) => setAdvanceRefDraft(e.target.value)}
                placeholder="Transaction ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAdvance} disabled={savingAdvance}>
              {savingAdvance ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Confirmation ───────────────────────────────────────────── */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Order {order ? orderNo(order) : ''} will be cancelled and all item stock will be
              restored. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
