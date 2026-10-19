'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ChevronLeft,
  Tag,
  X,
  User,
  MapPin,
  ShoppingCart,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  customerApi,
  productApi,
  orderApi,
  promoApi,
  paymentSettingsApi,
  type Customer,
  type OrderStatus,
} from '@/lib/api';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_LABELS,
} from '@/components/admin/orders/OrderStatusBadge';

// ── Local types ──────────────────────────────────────────────────────────────

type ProductResult = {
  _id: string;
  name: string;
  price: number;
  discountPrice: number;
  images: string[];
  stock: number;
  brand?: string;
  sku?: string;
};

type CartItem = {
  product: ProductResult;
  quantity: number;
};

type ShippingAddr = {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

const SHIPPING_FEE_OPTIONS = [
  { label: 'Free shipping', value: 0 },
  { label: 'Inside Dhaka — ৳60', value: 60 },
  { label: 'Outside Dhaka — ৳120', value: 120 },
  { label: 'Custom…', value: -1 },
];

const DEFAULT_ADDR: ShippingAddr = {
  fullName: '',
  phone: '',
  street: '',
  city: 'Dhaka',
  state: 'Dhaka',
  postcode: '1000',
  country: 'Bangladesh',
};

function effectivePrice(p: ProductResult) {
  return p.discountPrice > 0 ? p.discountPrice : p.price;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NewOrderPage() {
  const router = useRouter();

  // ── Step state ─────────────────────────────────────────────────────────────
  // We use a single-page layout (all sections visible), not wizard steps,
  // so staff can fill in any order they want.

  // ── Customer search ─────────────────────────────────────────────────────────
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const customerSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Product search ──────────────────────────────────────────────────────────
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [productSearching, setProductSearching] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // ── Cart ────────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);

  // ── Shipping ────────────────────────────────────────────────────────────────
  const [shippingAddr, setShippingAddr] = useState<ShippingAddr>(DEFAULT_ADDR);
  const [shippingFeeOption, setShippingFeeOption] = useState(0);
  const [customShippingFee, setCustomShippingFee] = useState('');

  // ── Coupon ──────────────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // ── Order meta ──────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed' | 'cancelled'>('pending');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
  const [note, setNote] = useState('');

  // ── Payment gateways ────────────────────────────────────────────────────────
  const [paymentMethods, setPaymentMethods] = useState<{ name: string; label: string }[]>([]);

  // ── Submission ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Load active payment gateways ────────────────────────────────────────────
  useEffect(() => {
    paymentSettingsApi.getActive()
      .then(({ data }) => {
        if (data.success && data.gateways.length > 0) {
          setPaymentMethods(data.gateways.map((g) => ({ name: g.name, label: g.label || g.name })));
          setPaymentMethod(data.gateways[0].name);
        } else {
          // Fallback to static list if no gateways configured
          setPaymentMethods(
            Object.entries(PAYMENT_METHOD_LABELS).map(([name, label]) => ({ name, label }))
          );
        }
      })
      .catch(() => {
        setPaymentMethods(
          Object.entries(PAYMENT_METHOD_LABELS).map(([name, label]) => ({ name, label }))
        );
      });
  }, []);

  // ── Customer search ─────────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerResults([]); return; }
    setCustomerSearching(true);
    try {
      const { data } = await customerApi.getAll({ search: q.trim(), limit: 6 });
      setCustomerResults(data.customers || []);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerSearching(false);
    }
  }, []);

  useEffect(() => {
    if (customerSearchRef.current) clearTimeout(customerSearchRef.current);
    customerSearchRef.current = setTimeout(() => searchCustomers(customerQuery), 350);
    return () => { if (customerSearchRef.current) clearTimeout(customerSearchRef.current); };
  }, [customerQuery, searchCustomers]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerQuery('');
    setCustomerResults([]);
    // Pre-fill shipping address from customer's address
    setShippingAddr({
      fullName: c.name || '',
      phone: c.phone || '',
      street: c.address?.street || '',
      city: c.address?.city || 'Dhaka',
      state: c.address?.state || 'Dhaka',
      postcode: c.address?.postcode || '1000',
      country: c.address?.country || 'Bangladesh',
    });
  };

  // ── Product search ──────────────────────────────────────────────────────────
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProductResults([]); setShowProductDropdown(false); return; }
    setProductSearching(true);
    try {
      const { data } = await productApi.getAll({ search: q.trim(), limit: 8, status: 'active' });
      setProductResults(data.products || []);
      setShowProductDropdown(true);
    } catch {
      setProductResults([]);
    } finally {
      setProductSearching(false);
    }
  }, []);

  useEffect(() => {
    if (productSearchRef.current) clearTimeout(productSearchRef.current);
    productSearchRef.current = setTimeout(() => searchProducts(productQuery), 300);
    return () => { if (productSearchRef.current) clearTimeout(productSearchRef.current); };
  }, [productQuery, searchProducts]);

  const addToCart = (product: ProductResult) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product._id === product._id);
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > product.stock) {
          toast.error(`Only ${product.stock} units in stock`);
          return prev;
        }
        return prev.map((i) =>
          i.product._id === product._id ? { ...i, quantity: newQty } : i
        );
      }
      if (product.stock < 1) {
        toast.error(`"${product.name}" is out of stock`);
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
    setProductQuery('');
    setShowProductDropdown(false);
    // Reset coupon when cart changes
    resetCoupon();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((item) => {
        if (item.product._id !== productId) return [item];
        const newQty = item.quantity + delta;
        if (newQty < 1) return [];
        if (newQty > item.product.stock) {
          toast.error(`Only ${item.product.stock} units in stock`);
          return [item];
        }
        return [{ ...item, quantity: newQty }];
      })
    );
    resetCoupon();
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product._id !== productId));
    resetCoupon();
  };

  // ── Coupon ──────────────────────────────────────────────────────────────────
  const resetCoupon = () => {
    setCouponDiscount(0);
    setCouponApplied(false);
    setCouponError('');
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const items = cart.map((i) => ({ product: i.product._id, quantity: i.quantity }));
      const subtotal = cart.reduce((s, i) => s + effectivePrice(i.product) * i.quantity, 0);
      const { data } = await promoApi.validate(couponCode.trim(), subtotal, items);
      if (data.success) {
        setCouponDiscount(data.discount);
        setCouponApplied(true);
        toast.success(`Coupon applied — ৳${data.discount.toLocaleString()} discount`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid or expired coupon';
      setCouponError(msg);
      setCouponDiscount(0);
      setCouponApplied(false);
    } finally {
      setValidatingCoupon(false);
    }
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + effectivePrice(i.product) * i.quantity, 0);
  const shippingFee =
    shippingFeeOption === -1
      ? Math.max(0, Number(customShippingFee) || 0)
      : shippingFeeOption;
  const total = Math.max(0, subtotal - couponDiscount + shippingFee);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!selectedCustomer) return 'Please select a customer';
    if (cart.length === 0) return 'Please add at least one product';
    if (!shippingAddr.street.trim()) return 'Street address is required';
    if (!shippingAddr.city.trim()) return 'City is required';
    if (!shippingAddr.state.trim()) return 'State / Division is required';
    if (!shippingAddr.postcode.trim()) return 'Postcode is required';
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const { data } = await orderApi.adminCreate({
        customerId: selectedCustomer!._id,
        items: cart.map((i) => ({ product: i.product._id, quantity: i.quantity })),
        shippingAddress: shippingAddr,
        paymentMethod,
        paymentStatus,
        orderStatus,
        note: note.trim() || undefined,
        couponCode: couponApplied ? couponCode.trim() : undefined,
        shippingFee,
      });
      toast.success(`Order ${data.order.orderNumber || data.order._id.slice(-6)} created successfully`);
      router.push(`/admin/orders/${data.order._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirm = () => {
    const error = validate();
    if (error) { toast.error(error); return; }
    setConfirmOpen(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Order</h1>
            <p className="text-sm text-muted-foreground">Create an order on behalf of a customer</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left column: Customer + Products + Shipping ──────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Customer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedCustomer ? (
                  <div className="flex items-start justify-between rounded-lg border bg-muted/40 px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                      {selectedCustomer.phone && (
                        <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                      )}
                      <Badge
                        variant="secondary"
                        className={
                          selectedCustomer.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setShippingAddr(DEFAULT_ADDR);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone…"
                      className="pl-9"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                    />
                    {(customerSearching || customerResults.length > 0) && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-lg">
                        {customerSearching ? (
                          <div className="p-3 space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full" />
                            ))}
                          </div>
                        ) : customerResults.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground">No customers found</p>
                        ) : (
                          <ul className="py-1 max-h-64 overflow-auto">
                            {customerResults.map((c) => (
                              <li
                                key={c._id}
                                className="flex cursor-pointer flex-col gap-0.5 px-4 py-2.5 hover:bg-accent"
                                onMouseDown={() => selectCustomer(c)}
                              >
                                <span className="font-medium text-sm">{c.name}</span>
                                <span className="text-xs text-muted-foreground">{c.email}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product search & cart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product search */}
                <div className="relative" onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={productInputRef}
                    placeholder="Search products by name or brand…"
                    className="pl-9"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    onFocus={() => productQuery && setShowProductDropdown(true)}
                  />
                  {showProductDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-lg">
                      {productSearching ? (
                        <div className="p-3 space-y-2">
                          {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : productResults.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">No products found</p>
                      ) : (
                        <ul className="py-1 max-h-72 overflow-auto">
                          {productResults.map((p) => {
                            const price = effectivePrice(p);
                            const inCart = cart.find((i) => i.product._id === p._id);
                            return (
                              <li
                                key={p._id}
                                className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent"
                                onMouseDown={() => addToCart(p)}
                              >
                                {p.images?.[0] ? (
                                  <img
                                    src={p.images[0]}
                                    alt={p.name}
                                    className="h-10 w-10 rounded object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    ৳{price.toLocaleString()}
                                    {p.discountPrice > 0 && (
                                      <span className="ml-1 line-through text-muted-foreground/60">
                                        ৳{p.price.toLocaleString()}
                                      </span>
                                    )}
                                    {' · '}stock: {p.stock}
                                  </p>
                                </div>
                                {inCart && (
                                  <Badge variant="secondary" className="shrink-0 text-xs">
                                    In cart ×{inCart.quantity}
                                  </Badge>
                                )}
                                {p.stock === 0 && (
                                  <Badge variant="secondary" className="shrink-0 text-xs bg-red-100 text-red-700">
                                    Out of stock
                                  </Badge>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Cart items */}
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">No items added yet</p>
                    <p className="text-xs mt-1">Search for products above to add them</p>
                  </div>
                ) : (
                  <div className="rounded-md border divide-y">
                    {cart.map(({ product, quantity }) => {
                      const price = effectivePrice(product);
                      return (
                        <div key={product._id} className="flex items-center gap-3 px-3 py-3">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ৳{price.toLocaleString()} each · stock: {product.stock}
                            </p>
                          </div>
                          {/* Qty controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(product._id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(product._id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="w-20 text-right text-sm font-semibold shrink-0">
                            ৳{(price * quantity).toLocaleString()}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                            onClick={() => removeFromCart(product._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="sa-fullname">Full name</Label>
                    <Input
                      id="sa-fullname"
                      placeholder="Recipient name"
                      value={shippingAddr.fullName}
                      onChange={(e) => setShippingAddr((a) => ({ ...a, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sa-phone">Phone</Label>
                    <Input
                      id="sa-phone"
                      placeholder="01XXXXXXXXX"
                      value={shippingAddr.phone}
                      onChange={(e) => setShippingAddr((a) => ({ ...a, phone: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="sa-street">
                      Street / Area <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sa-street"
                      placeholder="House, road, area"
                      value={shippingAddr.street}
                      onChange={(e) => setShippingAddr((a) => ({ ...a, street: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sa-city">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sa-city"
                      value={shippingAddr.city}
                      onChange={(e) => setShippingAddr((a) => ({ ...a, city: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sa-state">
                      Division / State <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sa-state"
                      value={shippingAddr.state}
                      onChange={(e) => setShippingAddr((a) => ({ ...a, state: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sa-postcode">
                      Postcode <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sa-postcode"
                      value={shippingAddr.postcode}
                      onChange={(e) => setShippingAddr((a) => ({ ...a, postcode: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sa-country">Country</Label>
                    <Input
                      id="sa-country"
                      value={shippingAddr.country}
                      onChange={(e) => setShippingAddr((a) => ({ ...a, country: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ── Right column: Pricing + Payment + Notes ──────────────────── */}
          <div className="space-y-6">

            {/* Order summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                  </span>
                  <span>৳{subtotal.toLocaleString()}</span>
                </div>

                {/* Shipping fee selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Shipping fee</Label>
                  <Select
                    value={String(shippingFeeOption)}
                    onValueChange={(v) => setShippingFeeOption(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPPING_FEE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shippingFeeOption === -1 && (
                    <Input
                      type="number"
                      min={0}
                      placeholder="Enter custom amount"
                      className="h-8 text-xs"
                      value={customShippingFee}
                      onChange={(e) => setCustomShippingFee(e.target.value)}
                    />
                  )}
                </div>

                {shippingFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>+৳{shippingFee.toLocaleString()}</span>
                  </div>
                )}

                {/* Coupon */}
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Coupon / Promo code
                  </Label>
                  {couponApplied ? (
                    <div className="flex items-center justify-between rounded bg-green-50 px-2 py-1.5">
                      <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {couponCode.toUpperCase()} — -৳{couponDiscount.toLocaleString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-green-700"
                        onClick={() => { resetCoupon(); setCouponCode(''); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Input
                        className="h-8 text-xs uppercase"
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                        disabled={cart.length === 0}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={applyCoupon}
                        disabled={!couponCode.trim() || cart.length === 0 || validatingCoupon}
                      >
                        {validatingCoupon ? '…' : 'Apply'}
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" /> {couponError}
                    </p>
                  )}
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>-৳{couponDiscount.toLocaleString()}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment & order status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="pay-method">Payment method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="pay-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="pay-status">Payment status</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}
                  >
                    <SelectTrigger id="pay-status">
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

                <div className="grid gap-1.5">
                  <Label htmlFor="order-status">Order status</Label>
                  <Select
                    value={orderStatus}
                    onValueChange={(v) => setOrderStatus(v as OrderStatus)}
                  >
                    <SelectTrigger id="order-status">
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
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Internal notes about this order (optional)…"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/500</p>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              className="w-full"
              size="lg"
              onClick={openConfirm}
              disabled={submitting}
            >
              {submitting ? 'Creating order…' : 'Create Order'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/admin/orders')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm order creation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Create order for <strong>{selectedCustomer?.name}</strong>?
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>{cart.reduce((s, i) => s + i.quantity, 0)} item(s)</li>
                  {couponDiscount > 0 && <li>Discount: -৳{couponDiscount.toLocaleString()}</li>}
                  {shippingFee > 0 && <li>Shipping: +৳{shippingFee.toLocaleString()}</li>}
                  <li className="font-medium text-foreground">Total: ৳{total.toLocaleString()}</li>
                  <li>Payment: {paymentMethods.find((m) => m.name === paymentMethod)?.label ?? paymentMethod} ({paymentStatus})</li>
                </ul>
                <p className="text-xs">Stock will be deducted immediately.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Create Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
