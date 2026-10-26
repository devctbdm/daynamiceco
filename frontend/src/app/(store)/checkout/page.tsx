'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  Copy,
  CreditCard,
  FileText,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useAuth, useCart, useCheckout, useUI } from '@/store';
import {
  authApi,
  orderApi,
  loyaltyApi,
  paymentApi,
  paymentSettingsApi,
  promoApi,
  type ActivePaymentGateway,
  type SavedAddress,
} from '@/lib/api';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import RequireAuth from '@/components/store/layout/RequireAuth';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';

const DELIVERY_METHODS = [
  {
    value: 'standard',
    label: 'Standard Delivery',
    eta: '3–5 business days',
    cost: 0,
  },
  {
    value: 'express',
    label: 'Express Delivery',
    eta: '1–2 business days',
    cost: 100,
  },
] as const;

const GATEWAY_ICONS: Record<string, typeof CreditCard> = {
  sslcommerz: CreditCard,
  bkash: Smartphone,
};

type DeliveryValue = (typeof DELIVERY_METHODS)[number]['value'];

const CheckoutSkeleton = () => (
  <div
    className="mx-auto max-w-7xl px-4 py-8"
    role="status"
    aria-label="Loading checkout"
  >
    <Skeleton className="h-9 w-44" />
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Skeleton className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="w-full space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>

    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-48" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-3 h-24 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-44" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-10 w-full rounded-xl" />
          <div className="mt-5 space-y-3 border-t border-gray-200 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="mt-5 space-y-2 border-t border-gray-200 pt-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <Skeleton className="mt-5 h-6 w-full" />
          <Skeleton className="mt-4 h-10 w-full rounded-lg" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-52" />
          <div className="mt-4 space-y-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CheckoutContent = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { items, totalItems, totalPrice, clearCart, fetchCart } = useCart();
  const { paymentMethod, setPaymentMethod, notes, setNotes } = useCheckout();
  const { showToast } = useUI();
  const { buyingEnabled, sellingMessage } = useStoreStatus();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: 'percentage' | 'fixed' | 'free_shipping';
    description?: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [loyaltyQuote, setLoyaltyQuote] = useState<{
    enabled: boolean;
    balance: number;
    estimatedPoints: number;
    minimumRedemption: number;
    maximumRedeemPoints: number;
    pointValue: number;
  } | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryValue>('standard');
  const [agreed, setAgreed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<string | null>(null);

  const [gateways, setGateways] = useState<ActivePaymentGateway[]>([]);

  useEffect(() => {
    paymentSettingsApi
      .getActive()
      .then(({ data }) => {
        setGateways(data.gateways || []);
        if (data.gateways?.length) {
          setPaymentMethod(data.gateways[0].name.toLowerCase());
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCart().catch(() => {});
    let cancelled = false;
    setAddressesLoading(true);
    authApi
      .getAddresses()
      .then(({ data }) => {
        if (cancelled) return;
        setAddresses(data.addresses || []);
        const def =
          data.addresses.find((a) => a.isDefault) || data.addresses[0];
        if (def) setSelectedAddressId(def._id);
      })
      .catch(() => {
        if (!cancelled) showToast('Failed to load addresses', 'error');
      })
      .finally(() => {
        if (!cancelled) setAddressesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const selectedAddress = useMemo(
    () =>
      addresses.find((a) => a._id === selectedAddressId) ||
      addresses.find((a) => a.isDefault) ||
      addresses[0],
    [addresses, selectedAddressId]
  );

  useEffect(() => {
    if (!isAuthenticated || items.length === 0) {
      setLoyaltyQuote(null);
      return;
    }
    let cancelled = false;
    setLoyaltyLoading(true);
    loyaltyApi
      .quote(
        items.map((item) => ({
          product: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        appliedCoupon?.code
      )
      .then(({ data }) => {
        if (!cancelled) setLoyaltyQuote(data.quote);
      })
      .catch(() => {
        if (!cancelled) {
          setLoyaltyQuote(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoyaltyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, items, appliedCoupon?.code]);

  const subtotal = totalPrice;
  const couponDiscount = appliedCoupon?.discount || 0;
  const requestedPoints = usePoints ? Number(redeemInput) : 0;
  const maxRedeemPoints = loyaltyQuote
    ? Math.min(loyaltyQuote.balance, loyaltyQuote.maximumRedeemPoints)
    : 0;
  const redemptionValid =
    Number.isSafeInteger(requestedPoints) &&
    requestedPoints >= (loyaltyQuote?.minimumRedemption ?? 0) &&
    requestedPoints <= maxRedeemPoints;
  const loyaltyDiscount =
    redemptionValid && loyaltyQuote
      ? Math.round(requestedPoints * loyaltyQuote.pointValue * 100) / 100
      : 0;
  const deliveryCost =
    appliedCoupon?.type === 'free_shipping'
      ? 0
      : DELIVERY_METHODS.find((d) => d.value === deliveryMethod)?.cost || 0;
  const grandTotal =
    Math.max(0, subtotal - couponDiscount - loyaltyDiscount) + deliveryCost;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setOrderError('');
    try {
      const { data } = await promoApi.validate(
        code,
        subtotal,
        items.map((i) => ({ product: i.productId, quantity: i.quantity }))
      );
      setAppliedCoupon({
        code: data.promo.code || code,
        discount: data.discount,
        type: data.promo.type || 'percentage',
        description: data.promo.description,
      });
      setCouponInput('');
      if (data.promo.type === 'free_shipping') {
        showToast('Coupon applied! Free shipping on this order', 'success');
      } else if (data.discount > 0) {
        showToast(
          `Coupon applied! You saved ৳${data.discount.toLocaleString()}`,
          'success'
        );
      } else {
        showToast(
          'Coupon applied but it offers no discount on your cart',
          'info'
        );
      }
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.reason === 'no-category' && data?.categories?.length) {
        showToast(
          `This code is only valid for: ${data.categories.join(', ')}`,
          'error'
        );
      } else {
        showToast(data?.message || 'Invalid coupon code', 'error');
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    setOrderError('');
    if (!buyingEnabled) {
      setOrderError(
        sellingMessage?.trim() ||
          'Buying is temporarily disabled. You can browse products, but orders cannot be placed right now.'
      );
      return;
    }
    if (!isAuthenticated || !user) return;
    if (items.length === 0) return;
    if (!selectedAddress) {
      setOrderError('Please select a shipping address.');
      return;
    }
    if (!agreed) {
      setOrderError(
        'Please read and agree to the Terms & Conditions, Privacy Policy and Refund & Return Policy.'
      );
      return;
    }
    if (
      usePoints &&
      (!loyaltyQuote?.enabled || !redemptionValid || requestedPoints <= 0)
    ) {
      setOrderError(
        'Enter a valid points amount within your available balance and order limit.'
      );
      return;
    }

    setPlacing(true);
    try {
      // For online payments, reuse an order left in "pending/failed" from a
      // previous attempt instead of creating a duplicate. We track it in
      // sessionStorage so any re-entry (Try again, Back to cart → checkout)
      // re-pays the SAME order.
      const PENDING_KEY = 'aiz_pending_order';
      let orderId: string | null = null;

      if (paymentMethod === 'sslcommerz') {
        const pendingId =
          typeof window !== 'undefined'
            ? sessionStorage.getItem(PENDING_KEY)
            : null;
        if (pendingId) {
          try {
            const existing = await orderApi.getById(pendingId);
            const o = existing.data.order;
            const retryable =
              o &&
              o.payment?.status !== 'paid' &&
              !['cancelled'].includes(o.orderStatus);
            if (retryable) {
              orderId = o._id;
            } else {
              sessionStorage.removeItem(PENDING_KEY);
            }
          } catch {
            sessionStorage.removeItem(PENDING_KEY);
          }
        }
      }

      // Create a new order only when we don't already have a reusable one.
      if (!orderId) {
        const { data } = await orderApi.create({
          items: items.map((i) => ({
            product: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shippingAddress: {
            fullName: selectedAddress.fullName || user.name,
            phone: selectedAddress.phone || user.phone,
            street: selectedAddress.street,
            city: selectedAddress.city,
            state: selectedAddress.state,
            postcode: selectedAddress.postcode,
            country: selectedAddress.country,
          },
          paymentMethod,
          note: notes,
          couponCode: appliedCoupon?.code,
          redeemPoints: usePoints ? requestedPoints : 0,
          deliveryMethod,
        });
        orderId = data.order._id;
        if (paymentMethod === 'sslcommerz' && typeof window !== 'undefined') {
          sessionStorage.setItem(PENDING_KEY, orderId);
        }
      }

      // SSLCommerz online payment: redirect to the payment gateway page.
      if (paymentMethod === 'sslcommerz') {
        const customer = {
          name: selectedAddress.fullName || user.name,
          email: user.email,
          phone: selectedAddress.phone || user.phone,
          address: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postcode: selectedAddress.postcode,
        };
        try {
          const payRes = await paymentApi.initiate({
            orderId,
            customer,
          });
          if (payRes.data.success && payRes.data.gatewayUrl) {
            // Do NOT clear the cart here — if the payment fails the customer
            // needs the items back (the /payment/fail "Try again" flow). The
            // cart is cleared on the /payment/success page after a real payment.
            setAppliedCoupon(null);
            window.location.href = payRes.data.gatewayUrl;
            return;
          }
          throw new Error(
            payRes.data.gatewayUrl
              ? 'Payment gateway could not be reached. Please try again.'
              : 'Payment initiation failed. Please try again.'
          );
        } catch (payErr: any) {
          setOrderError(
            payErr?.response?.data?.message ||
              'Your order was created, but the payment gateway could not be reached. Please try again or pay from your orders.'
          );
          return;
        }
      }

      await clearCart();
      setAppliedCoupon(null);
      setPlacedOrder(orderId);
      showToast('Order placed successfully!', 'success');
    } catch (e: any) {
      setOrderError(
        e?.response?.data?.message ||
          'Failed to place your order. Please try again.'
      );
    } finally {
      setPlacing(false);
    }
  };

  const [copied, setCopied] = useState(false);

  if (placedOrder) {
    const copyOrderId = () => {
      void navigator.clipboard.writeText(String(placedOrder));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-green-200 bg-white p-8 text-center shadow-xl shadow-green-900/5 sm:p-10">
          {/* Decorative background glow */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-100/70 blur-3xl" />
          </div>

          {/* Order confirmation */}
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold tracking-wide text-green-700 uppercase">
            <Sparkles size={12} />
            Order confirmed
          </div>

          {/* Confirmation check */}
          <div className="relative mx-auto mb-6 h-24 w-24">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-50">
              <svg
                viewBox="0 0 52 52"
                className="h-14 w-14 text-green-600"
                fill="none"
              >
                <circle
                  cx="26"
                  cy="26"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <path
                  d="M16 27 L23 34 L37 19"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="absolute inset-0 -m-2 rounded-full border-2 border-green-300" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Order Placed Successfully!
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
            Thank you for shopping with Apple IT Zone. Your order has been
            received and is being processed.
          </p>

          {/* Order number row */}
          <button
            onClick={copyOrderId}
            className="group mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:border-green-300 hover:bg-green-50"
          >
            Order #{placedOrder}
            {copied ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy
                size={14}
                className="text-gray-400 transition-colors group-hover:text-green-600"
              />
            )}
          </button>

          {/* Info strip */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100">
                <Package size={16} className="text-green-700" />
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Status</div>
                <div className="text-sm font-semibold text-gray-900">
                  Processing
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Truck size={16} className="text-blue-700" />
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Est. delivery</div>
                <div className="text-sm font-semibold text-gray-900">
                  2–4 days
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/accounts">
              <Button fullWidth>
                <span className="flex items-center justify-center gap-2">
                  <FileText size={16} />
                  View My Orders
                </span>
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" fullWidth>
                <span className="flex items-center justify-center gap-2">
                  <ShoppingBag size={16} />
                  Continue Shopping
                </span>
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-xs text-gray-400">
            A confirmation email with your invoice has been sent to your inbox.
          </p>
        </div>
      </div>
    );
  }

  // ---- Auth still loading ----
  if (isLoading) {
    return <CheckoutSkeleton />;
  }

  // ---- Not logged in ----
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="inline-block">
            <AlertCircle size={48} className="text-amber-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-2 text-sm text-gray-600">
            You need to be signed in to checkout. Your saved address and orders
            will be available in your account.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button fullWidth>Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" fullWidth>
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Checkout</h1>

      {/* Company notice */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Apple IT Zone</span> — কারিগরি ত্রুটির
          কারণে পণ্যের মূল্য অসঙ্গতিপূর্ণ হলে, কর্তৃপক্ষ অর্ডার বাতিলের অধিকার
          সংরক্ষণ করে। অনুগ্রহ করে কাস্টমার সাপোর্ট এজেন্টের কনফার্মেশন ব্যতীত
          কোনো ধরনের পেমেন্ট প্রোসিড না করার অনুরোধ করা হচ্ছে ।
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---------- Left: Address + Special requirements ---------- */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Shipping Address
              </h2>
            </div>

            {addressesLoading ? (
              <div className="mt-4 space-y-3">
                <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                <MapPin size={32} className="mx-auto text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  Please update your profile and fill up your address.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  After filling up the address, it will show automatically.
                </p>
                <Link href="/accounts" className="mt-4 inline-block">
                  <Button size="sm">Go to Profile</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {addresses.map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => setSelectedAddressId(a._id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selectedAddress?._id === a._id
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          {a.label || 'Address'}
                        </span>
                        {a.isDefault && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                        <p className="font-medium text-gray-800">
                          {a.fullName}
                        </p>
                        {a.company && <p>{a.company}</p>}
                        <p>{a.phone}</p>
                        <p>{a.street}</p>
                        <p>
                          {a.city}, {a.state} {a.postcode}
                        </p>
                        <p>{a.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Link
                  href="/accounts"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
                >
                  Manage addresses
                </Link>
              </>
            )}
          </div>

          {/* Special requirements */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Special Requirements
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Any special request from the customer for this order.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-3"
              placeholder="e.g. Deliver after 6 PM, gift wrapping, call before delivery..."
            />
          </div>
        </div>

        {/* ---------- Right: Order Summary ---------- */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-4">
            <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

            {/* Coupon */}
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700">
                Coupon code
              </Label>

              {appliedCoupon ? (
                <div
                  key="applied"
                  className="mt-2 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-green-700">
                      {appliedCoupon.code}
                    </p>
                    {appliedCoupon.description && (
                      <p className="text-xs text-green-600">
                        {appliedCoupon.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      showToast('Coupon removed', 'info');
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    <XCircle size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div key="input" className="mt-2 flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </Button>
                </div>
              )}
            </div>

            {loyaltyQuote?.enabled && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={usePoints}
                    onCheckedChange={(checked) => {
                      setUsePoints(checked === true);
                      if (checked !== true) setRedeemInput('');
                    }}
                    className="mt-0.5"
                    aria-label="Redeem loyalty points"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                      Redeem reward points
                    </p>
                    {loyaltyLoading ? (
                      <Skeleton className="mt-2 h-4 w-40" />
                    ) : (
                      <p className="mt-1 text-xs text-amber-800">
                        {loyaltyQuote.balance.toLocaleString()} available · up
                        to {maxRedeemPoints.toLocaleString()} can be used on
                        this order
                      </p>
                    )}
                    {usePoints && (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="number"
                          min={loyaltyQuote.minimumRedemption}
                          max={maxRedeemPoints}
                          step={1}
                          value={redeemInput}
                          onChange={(event) =>
                            setRedeemInput(event.target.value)
                          }
                          placeholder={`Min ${loyaltyQuote.minimumRedemption}`}
                          className="h-9 bg-white"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            maxRedeemPoints < loyaltyQuote.minimumRedemption
                          }
                          onClick={() =>
                            setRedeemInput(String(maxRedeemPoints))
                          }
                        >
                          Max
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-total */}
            <div className="mt-5 space-y-3 border-t border-gray-200 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">
                  Subtotal ({totalItems} item{totalItems === 1 ? '' : 's'})
                </span>
                <span className="font-medium text-gray-900">
                  ৳{subtotal.toLocaleString()}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div key="discount" className="overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Coupon ({appliedCoupon?.code})
                    </span>
                    <span className="font-semibold text-green-600">
                      -৳{couponDiscount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              {appliedCoupon?.type === 'free_shipping' && (
                <div key="free-shipping" className="overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      Coupon ({appliedCoupon.code})
                    </span>
                    <span className="font-semibold text-green-600">
                      Free shipping
                    </span>
                  </div>
                </div>
              )}

              {loyaltyDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">
                    Rewards ({requestedPoints.toLocaleString()} points)
                  </span>
                  <span className="font-semibold text-green-600">
                    -৳{loyaltyDiscount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Delivery fee</span>
                <span className="font-medium text-gray-900">
                  {deliveryCost === 0
                    ? 'Free'
                    : `৳${deliveryCost.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Delivery method */}
            <div className="mt-5 border-t border-gray-200 pt-4">
              <Label className="text-sm font-medium text-gray-700">
                Delivery method
              </Label>
              <div className="mt-2 space-y-2">
                {DELIVERY_METHODS.map((d) => {
                  const active = deliveryMethod === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDeliveryMethod(d.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        active
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Truck
                        size={18}
                        className={active ? 'text-blue-600' : 'text-gray-400'}
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          {d.label}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {d.eta}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {d.cost === 0 ? 'Free' : `৳${d.cost}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="font-semibold text-gray-900">Total</span>

              <span
                key={grandTotal}
                className="text-xl font-bold text-gray-900"
              >
                ৳{grandTotal.toLocaleString()}
              </span>
            </div>

            {/* Terms */}
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={agreed}
                onCheckedChange={() => setAgreed(!agreed)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed text-gray-600">
                I have read and agree to the{' '}
                <Link
                  href="/terms"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Terms and Conditions
                </Link>
                ,{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link
                  href="/refund"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Refund and Return Policy
                </Link>
                .
              </span>
            </label>

            {orderError && (
              <p className="mt-3 overflow-hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {orderError}
              </p>
            )}

            <Button
              fullWidth
              size="lg"
              className="mt-4"
              loading={placing}
              onClick={handlePlaceOrder}
              disabled={items.length === 0 || !buyingEnabled}
            >
              {buyingEnabled ? 'Confirm Order' : 'Buying Disabled'}
            </Button>

            {!buyingEnabled && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                {sellingMessage?.trim() ||
                  'Buying is temporarily disabled. You can browse products, but orders cannot be placed right now.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Bottom: Payment + Delivery ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Payment Method</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {gateways.map((p) => {
              const value = p.name.toLowerCase();
              const active = paymentMethod === value;
              const Icon = GATEWAY_ICONS[value] || Wallet;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon
                    size={20}
                    className={active ? 'text-blue-600' : 'text-gray-400'}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">
                      {p.label}
                    </span>
                    {p.description && (
                      <span className="block text-xs text-gray-500">
                        {p.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {gateways.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No payment methods are available right now.
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-gray-200 pt-4">
            <Label className="text-sm font-medium text-gray-700">
              Delivery method
            </Label>
            <p className="mt-1.5 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {
                  DELIVERY_METHODS.find((d) => d.value === deliveryMethod)
                    ?.label
                }
              </span>{' '}
              · {DELIVERY_METHODS.find((d) => d.value === deliveryMethod)?.eta}
              {' · '}
              {deliveryCost === 0
                ? 'Free'
                : `৳${deliveryCost.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* ---------- Bottom: Selected products ---------- */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-900">
            Selected Products ({totalItems})
          </h2>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              Your cart is empty.{' '}
              <Link
                href="/"
                className="font-medium text-blue-600 hover:underline"
              >
                Continue shopping
              </Link>
            </p>
          ) : (
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={item.image || '/placeholder-image.png'}
                      alt={item.name}
                      fill
                      className="object-contain"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      ৳{item.price.toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    ৳{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <RequireAuth loadingFallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </RequireAuth>
  );
}
