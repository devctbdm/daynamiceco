'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User,
  Package,
  Heart,
  MapPin,
  KeyRound,
  Pencil,
  LogOut,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Award,
  Bell,
  CheckCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWishlist, useCart, useAuth } from '@/store';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';
import {
  authApi,
  loyaltyApi,
  orderApi,
  notificationApi,
  type AdminNotification,
  paymentApi,
  SavedAddress,
  type LoyaltyTransaction,
} from '@/lib/api';
import RequireAuth from '@/components/store/layout/RequireAuth';
import { getSocket } from '@/lib/socket';

type OrderStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'send_courier'
  | 'delivered'
  | 'cancelled';
type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantLabel?: string;
  sku?: string;
};
type Order = {
  id: string;
  date: string;
  total: number;
  shippingFee?: number;
  status: OrderStatus;
  items: OrderItem[];
  orderNumber?: string;
  coupon?: { code: string; discount: number };
  loyalty?: {
    pointsRedeemed?: number;
    discount?: number;
    pointsEarned?: number;
  };
  payment?: {
    method: string;
    status: string;
    tran_id?: string;
    amount?: number;
    val_id?: string;
    paidAt?: string;
  };
  advanceAmount?: number;
  advancePaid?: number;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
};

type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  company: string;
  line1: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  deliveryArea: string;
  isDefault: boolean;
};

type WishItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  inStock: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const ORDERS_PER_PAGE = 5;

function pageItems(
  current: number,
  total: number
): (number | 'ellipsis-l' | 'ellipsis-r')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis-l' | 'ellipsis-r')[] = [1];
  if (current > 3) pages.push('ellipsis-l');
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('ellipsis-r');
  pages.push(total);
  return pages;
}

const mapBackendAddress = (a: SavedAddress): Address => ({
  id: a._id,
  label: a.label,
  fullName: a.fullName,
  phone: a.phone,
  company: a.company || '',
  line1: a.street,
  city: a.city,
  region: a.state,
  postal: a.postcode,
  country: a.country,
  deliveryArea: a.deliveryArea || '',
  isDefault: a.isDefault,
});

const statusMeta: Record<
  OrderStatus,
  { label: string; className: string; Icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800',
    Icon: Clock,
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800',
    Icon: Truck,
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-emerald-100 text-emerald-800',
    Icon: CheckCircle2,
  },
  send_courier: {
    label: 'Sent to Courier',
    className: 'bg-violet-100 text-violet-800',
    Icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-800',
    Icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-100 text-rose-800',
    Icon: XCircle,
  },
};

const fmtDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : undefined;

type TimelineStep = {
  title: string;
  description?: string;
  date?: string;
  state: 'done' | 'current' | 'upcoming';
};

const ORDER_STAGES = [
  'pending',
  'processing',
  'confirmed',
  'send_courier',
  'delivered',
] as const;
type Stage = (typeof ORDER_STAGES)[number];

// Reconstruct the order journey from the order's current state.
function buildTimeline(o: Order, phone?: string): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const stage = (ORDER_STAGES as readonly string[]).indexOf(o.status);
  const reached = (req: Stage) => stage >= ORDER_STAGES.indexOf(req);

  steps.push({
    title: 'Order Placed',
    description: `Order ${
      o.orderNumber || o.id.slice(-6).toUpperCase()
    } placed successfully.`,
    date: fmtDate(o.date),
    state: 'done',
  });

  if (o.status === 'cancelled') {
    steps.push({
      title: 'Cancelled',
      description: 'This order was cancelled.',
      state: 'current',
    });
    return steps;
  }

  steps.push({
    title: 'Confirmation Call',
    description: reached('processing')
      ? 'Our operator called and confirmed your order.'
      : 'Our operator will call you to confirm this order. If we can’t reach you, we’ll retry.',
    state: reached('processing') ? 'done' : 'current',
  });

  steps.push({
    title: 'Processing',
    description: 'Your order is being prepared.',
    state: reached('processing') ? 'done' : 'upcoming',
  });

  if (o.advanceAmount && o.advanceAmount > 0) {
    const paid = (o.advancePaid || 0) >= o.advanceAmount;
    steps.push({
      title: paid ? 'Advance Payment Paid' : 'Pending for advance payment',
      description: paid
        ? `Advance ৳${o.advancePaid?.toLocaleString()} received.`
        : `Please pay ৳${o.advanceAmount.toLocaleString()} advance to confirm this order.`,
      date: paid ? fmtDate(o.date) : undefined,
      state: paid ? 'done' : 'current',
    });
  }

  const pay = o.payment;
  if (pay?.status === 'paid') {
    steps.push({
      title: 'Payment Paid',
      description: `Payer Info: ${phone || '—'}${
        pay.val_id
          ? ` · Gateway Status: ${pay.val_id}`
          : ' · Gateway Status: 0000'
      }`,
      date: fmtDate(pay.paidAt || o.date),
      state: 'done',
    });
  } else if (pay?.method === 'cod') {
    steps.push({
      title: 'Cash on Delivery',
      description: 'Payment is due on delivery.',
      state: 'done',
    });
  } else {
    steps.push({
      title: 'Payment Pending',
      description: 'Awaiting payment for this order.',
      state: 'upcoming',
    });
  }

  steps.push({
    title: 'Confirmed',
    description: 'Order confirmed by admin and is being prepared.',
    state: reached('confirmed') ? 'done' : 'upcoming',
  });

  steps.push({
    title: 'Send To Courier',
    description: 'Order handed to the courier for delivery.',
    state: reached('send_courier') ? 'done' : 'upcoming',
  });
  steps.push({
    title: 'Delivered',
    description: 'Your order has been delivered.',
    state: reached('delivered') ? 'done' : 'upcoming',
  });

  return steps;
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(60),
  phone: z.string().trim().min(6, 'Phone required').max(30),
});

const passwordSchema = z
  .object({
    current: z.string().min(6, 'Enter current password'),
    next: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(8, 'At least 8 characters'),
  })
  .refine((v) => v.next === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

const addressSchema = z.object({
  label: z.string().trim().max(30),
  firstName: z.string().trim().min(1, 'First name is required').max(40),
  lastName: z.string().trim().min(1, 'Last name is required').max(40),
  company: z.string().trim().max(80),
  phone: z.string().trim().min(6).max(30),
  line1: z.string().trim().min(1, 'Address is required').max(160),
  city: z.string().trim().min(1, 'City is required').max(80),
  region: z.string().trim().min(1, 'Region / State is required').max(80),
  postal: z.string().trim().min(1, 'Postcode is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(80),
  deliveryArea: z.string().trim().max(160).default(''),
});

const emptyAddressForm = () => ({
  label: '',
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  line1: '',
  city: '',
  region: '',
  postal: '',
  country: '',
  deliveryArea: '',
});

function AccountContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: user?.name || 'Guest',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [rewards, setRewards] = useState<{
    balance: number;
    pendingPoints: number;
    expiringPoints: number;
    nextExpiration: string | null;
    transactions: LoyaltyTransaction[];
    total: number;
    pages: number;
  } | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsPage, setRewardsPage] = useState(1);
  const isCustomer = user?.role === 'customer';
  const { wishlist: wishItems, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();
  const { buyingEnabled, sellingMessage } = useStoreStatus();
  const wishlist: WishItem[] = wishItems.map((w) => ({
    id: w._id,
    name: w.name,
    price: w.discountPrice > 0 ? w.discountPrice : w.price,
    image: w.image,
    inStock: w.stock > 0,
  }));

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [addressDialog, setAddressDialog] = useState<{
    open: boolean;
    editing?: Address;
  }>({ open: false });
  const [deleteAddress, setDeleteAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, email: user.email, phone: user.phone });
    }
  }, [user]);

  useEffect(() => {
    authApi
      .getAddresses()
      .then(({ data }) => {
        if (data.success) setAddresses(data.addresses.map(mapBackendAddress));
      })
      .catch(() => toast.error('Failed to load addresses'))
      .finally(() => setAddressesLoading(false));
  }, []);

  useEffect(() => {
    orderApi
      .getMyOrders()
      .then(({ data }) => {
        if (data.success) {
          setOrders(
            data.orders.map((o) => ({
              id: o._id,
              date: o.createdAt,
              total: o.totalAmount,
              shippingFee: o.shippingFee,
              orderNumber: o.orderNumber,
              status: o.orderStatus,
              coupon: o.coupon,
              loyalty: o.loyalty,
              payment: o.payment,
              advanceAmount: o.advanceAmount,
              advancePaid: o.advancePaid,
              shippingAddress: o.shippingAddress,
              items: o.items.map((i) => ({
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                image: i.image,
                variantLabel: i.variantLabel,
                sku: i.sku,
              })),
            }))
          );
        }
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    if (!isCustomer) {
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    let active = true;
    const loadNotifications = () =>
      notificationApi
        .customerList({ limit: 50 })
        .then(({ data }) => {
          if (!active || !data.success) return;
          setNotifications(data.notifications);
          setUnreadNotifications(data.unreadCount);
        })
        .catch(() => {
          if (active) toast.error('Failed to load notifications');
        })
        .finally(() => {
          if (active) setNotificationsLoading(false);
        });

    void loadNotifications();
    const socket = getSocket();
    const onNotification = () => {
      void loadNotifications();
    };
    socket.on('notification:new', onNotification);

    return () => {
      active = false;
      socket.off('notification:new', onNotification);
    };
  }, [isCustomer, user?.id]);

  useEffect(() => {
    if (!isCustomer) {
      setRewardsLoading(false);
      return;
    }

    let cancelled = false;
    setRewardsLoading(true);
    loyaltyApi
      .mine({ page: rewardsPage, limit: 10 })
      .then(({ data }) => {
        if (cancelled) return;
        setRewards({
          balance: data.balance,
          pendingPoints: data.pendingPoints,
          expiringPoints: data.expiringPoints,
          nextExpiration: data.nextExpiration,
          transactions: data.transactions,
          total: data.total,
          pages: data.pages,
        });
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load reward points');
      })
      .finally(() => {
        if (!cancelled) setRewardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCustomer, rewardsPage]);

  const totalOrderPages = Math.max(
    1,
    Math.ceil(orders.length / ORDERS_PER_PAGE)
  );
  const paginatedOrders = orders.slice(
    (orderPage - 1) * ORDERS_PER_PAGE,
    orderPage * ORDERS_PER_PAGE
  );

  useEffect(() => {
    setOrderPage((p) =>
      Math.min(p, Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE)))
    );
  }, [orders]);

  const stats = useMemo(() => {
    const totalSpent = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((a, o) => a + o.total, 0);
    return {
      orders: orders.length,
      pending: orders.filter((o) => o.status !== 'cancelled').length,
      wishlist: wishlist.length,
      addresses: addresses.length,
      totalSpent,
    };
  }, [orders, addresses, wishItems]);

  const setDefaultAddress = async (id: string) => {
    try {
      const { data } = await authApi.setDefaultAddress(id);
      if (data.success) {
        setAddresses(data.addresses.map(mapBackendAddress));
        toast.success('Default address updated');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update address');
    }
  };

  const saveAddress = async (
    values: z.infer<typeof addressSchema>,
    id?: string
  ) => {
    const payload = {
      label: values.label || 'Home',
      fullName: `${values.firstName} ${values.lastName}`.trim(),
      phone: values.phone,
      company: values.company,
      street: values.line1,
      city: values.city,
      state: values.region,
      postcode: values.postal,
      country: values.country,
      deliveryArea: values.deliveryArea,
    };
    try {
      const { data } = id
        ? await authApi.updateAddress(id, payload)
        : await authApi.addAddress(payload);
      if (data.success) {
        setAddresses(data.addresses.map(mapBackendAddress));
        toast.success(id ? 'Address updated' : 'Address added');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save address');
    }
  };

  const removeAddress = async (id: string) => {
    try {
      const { data } = await authApi.deleteAddress(id);
      if (data.success) {
        setAddresses(data.addresses.map(mapBackendAddress));
        toast.success('Address removed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove address');
    }
  };

  const removeWish = (id: string) => {
    removeFromWishlist(id);
    toast.success('Removed from wishlist');
  };

  const markCustomerNotificationRead = async (id: string) => {
    const notification = notifications.find((item) => item._id === id);
    if (!notification || notification.read) return;
    setNotifications((current) =>
      current.map((item) => (item._id === id ? { ...item, read: true } : item))
    );
    setUnreadNotifications((count) => Math.max(0, count - 1));
    try {
      await notificationApi.customerMarkRead(id);
    } catch {
      setNotifications((current) =>
        current.map((item) =>
          item._id === id ? { ...item, read: false } : item
        )
      );
      setUnreadNotifications((count) => count + 1);
      toast.error('Failed to update notification');
    }
  };

  const markAllCustomerNotificationsRead = async () => {
    const previous = notifications;
    const previousUnread = unreadNotifications;
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );
    setUnreadNotifications(0);
    try {
      await notificationApi.customerMarkAllRead();
    } catch {
      setNotifications(previous);
      setUnreadNotifications(previousUnread);
      toast.error('Failed to update notifications');
    }
  };

  const payAdvance = async (o: Order) => {
    if (!o.advanceAmount) return;
    try {
      const customer = {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: [o.shippingAddress?.street, o.shippingAddress?.city]
          .filter(Boolean)
          .join(', '),
        city: o.shippingAddress?.city,
        state: o.shippingAddress?.state,
        postcode: o.shippingAddress?.postcode,
        country: o.shippingAddress?.country,
      };
      const { data } = await paymentApi.initiate({
        orderId: o.id,
        customer,
        advance: true,
      });
      if (data.success && data.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      } else {
        toast.error('Could not start the advance payment');
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Could not start the advance payment'
      );
    }
  };

  const saveProfile = async (v: z.infer<typeof profileSchema>) => {
    try {
      await authApi.updateProfile({ name: v.name, phone: v.phone });
      setProfile({ ...profile, name: v.name, phone: v.phone });
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Profile summary */}
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                {profile.name.trim().charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl font-semibold">{profile.name}</h1>
                <p className="text-sm text-gray-600">{profile.email}</p>
                <p className="text-sm text-gray-600">{profile.phone}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setEditProfileOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit profile
              </Button>
              <Button variant="outline" onClick={() => setChangePassOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" /> Change password
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Orders"
            value={stats.orders}
            Icon={Package}
            tone="bg-blue-50 text-blue-600"
            loading={ordersLoading}
          />
          <StatCard
            label="In Progress"
            value={stats.pending}
            Icon={Truck}
            tone="bg-amber-50 text-amber-600"
            loading={ordersLoading}
          />
          <StatCard
            label="Wishlist Items"
            value={stats.wishlist}
            Icon={Heart}
            tone="bg-rose-50 text-rose-600"
          />
          <StatCard
            label="Saved Addresses"
            value={stats.addresses}
            Icon={MapPin}
            tone="bg-emerald-50 text-emerald-600"
            loading={addressesLoading}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6">
            <TabsTrigger value="orders">
              <Package className="mr-2 h-4 w-4" /> Orders
            </TabsTrigger>
            {isCustomer && (
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" /> Notifications
                {unreadNotifications > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadNotifications}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="wishlist">
              <Heart className="mr-2 h-4 w-4" /> Wishlist
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin className="mr-2 h-4 w-4" /> Addresses
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="rewards">
              <Award className="mr-2 h-4 w-4" /> Rewards
            </TabsTrigger>
          </TabsList>

          {/* Orders */}
          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent orders</CardTitle>
                <CardDescription>
                  Track your recent purchases and their status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ordersLoading ? (
                  <OrdersSkeleton />
                ) : orders.length === 0 ? (
                  <EmptyState
                    Icon={ShoppingBag}
                    title="No orders yet"
                    hint="Your orders will appear here."
                  />
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedOrders.map((o) => {
                        const meta = statusMeta[o.status] || statusMeta.pending;
                        const Icon = meta.Icon;
                        return (
                          <div
                            key={o.id}
                            className="rounded-lg border bg-card p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  Order{' '}
                                  {o.orderNumber ||
                                    o.id.slice(-6).toUpperCase()}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={meta.className}
                                >
                                  <Icon className="mr-1 h-3 w-3" />
                                  {meta.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold">
                                  ৳{o.total.toLocaleString()}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setViewOrder(o)}
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-gray-600">
                              {new Date(o.date).toLocaleDateString()} ·{' '}
                              {o.items.length} item
                              {o.items.length > 1 ? 's' : ''}
                            </p>
                            {o.coupon && o.coupon.discount > 0 && (
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-gray-600">
                                  Coupon ({o.coupon.code})
                                </span>
                                <span className="font-medium text-green-600">
                                  -৳{o.coupon.discount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {(o.loyalty?.discount ?? 0) > 0 && (
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-gray-600">
                                  Reward points
                                </span>
                                <span className="font-medium text-green-600">
                                  -৳{o.loyalty?.discount?.toLocaleString()} (
                                  {o.loyalty?.pointsRedeemed?.toLocaleString()}{' '}
                                  points)
                                </span>
                              </div>
                            )}
                            <div className="mt-3 space-y-2">
                              {o.items.map((it, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 rounded-md border p-2"
                                >
                                  {it.image ? (
                                    <img
                                      src={it.image}
                                      alt={it.name}
                                      className="h-14 w-14 shrink-0 rounded-md border object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gray-100">
                                      <Package className="h-5 w-5 text-gray-600" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                      {it.name}
                                    </p>
                                    {(it.variantLabel || it.sku) && (
                                      <p className="truncate text-xs text-gray-500">
                                        {[
                                          it.variantLabel,
                                          it.sku && `SKU: ${it.sku}`,
                                        ]
                                          .filter(Boolean)
                                          .join(' · ')}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-600">
                                      {it.quantity} × ৳
                                      {it.price.toLocaleString()}
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium">
                                    ৳{(it.price * it.quantity).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                            {o.advanceAmount ? (
                              <div className="mt-3 rounded-md border border-dashed bg-gray-50 p-3">
                                {o.advancePaid &&
                                o.advancePaid >= o.advanceAmount ? (
                                  <p className="text-xs text-green-600">
                                    Advance paid: ৳
                                    {o.advancePaid.toLocaleString()} · Due on
                                    delivery: ৳
                                    {(
                                      o.total - (o.advancePaid || 0)
                                    ).toLocaleString()}
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs text-gray-600">
                                      Confirm this order with a ৳
                                      {o.advanceAmount.toLocaleString()} advance
                                      (deducted from delivery total).
                                    </p>
                                    <Button
                                      size="sm"
                                      onClick={() => payAdvance(o)}
                                    >
                                      Pay ৳{o.advanceAmount.toLocaleString()}{' '}
                                      advance
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {totalOrderPages > 1 && (
                      <Pagination className="pt-1">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={(e) => {
                                e.preventDefault();
                                setOrderPage((p) => Math.max(1, p - 1));
                              }}
                              className={
                                orderPage === 1
                                  ? 'pointer-events-none opacity-50'
                                  : ''
                              }
                            />
                          </PaginationItem>
                          {pageItems(orderPage, totalOrderPages).map((p, i) =>
                            p === 'ellipsis-l' || p === 'ellipsis-r' ? (
                              <PaginationItem key={`${p}-${i}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            ) : (
                              <PaginationItem key={p}>
                                <PaginationLink
                                  isActive={p === orderPage}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setOrderPage(p);
                                  }}
                                >
                                  {p}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          )}
                          <PaginationItem>
                            <PaginationNext
                              onClick={(e) => {
                                e.preventDefault();
                                setOrderPage((p) =>
                                  Math.min(totalOrderPages, p + 1)
                                );
                              }}
                              className={
                                orderPage === totalOrderPages
                                  ? 'pointer-events-none opacity-50'
                                  : ''
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isCustomer && (
            <TabsContent value="notifications" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                      Updates about your orders, including status changes.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllCustomerNotificationsRead}
                    disabled={unreadNotifications === 0}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark all read
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notificationsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <EmptyState
                      Icon={Bell}
                      title="No notifications"
                      hint="Order updates will appear here."
                    />
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
                          notification.read ? 'bg-card' : 'bg-primary/5'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.read && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.description}
                          </p>
                          {notification.createdAt && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(
                                notification.createdAt
                              ).toLocaleString()}
                            </p>
                          )}
                          {notification.link && (
                            <Link
                              href={notification.link}
                              className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
                            >
                              View details
                            </Link>
                          )}
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              markCustomerNotificationRead(notification._id)
                            }
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Wishlist */}
          <TabsContent value="wishlist" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>My wishlist</CardTitle>
                <CardDescription>Items you saved for later.</CardDescription>
              </CardHeader>
              <CardContent>
                {wishlist.length === 0 ? (
                  <EmptyState
                    Icon={Heart}
                    title="Wishlist is empty"
                    hint="Save products to view them here."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {wishlist.map((w) => (
                      <div
                        key={w.id}
                        className="overflow-hidden rounded-lg border bg-card"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-gray-100">
                          <img
                            src={w.image}
                            alt={w.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{w.name}</p>
                            <Badge
                              variant={w.inStock ? 'secondary' : 'destructive'}
                            >
                              {w.inStock ? 'In stock' : 'Out'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            ৳{w.price.toLocaleString()}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={!w.inStock || !buyingEnabled}
                              onClick={() => {
                                if (!buyingEnabled) {
                                  toast.error(
                                    sellingMessage?.trim() ||
                                      'Buying is temporarily disabled right now.'
                                  );
                                  return;
                                }
                                addItem({
                                  productId: w.id,
                                  name: w.name,
                                  price: w.price,
                                  promoDiscount: 0,
                                  image: w.image,
                                  stock: w.inStock ? 1 : 0,
                                  quantity: 1,
                                });
                                toast.success('Added to cart');
                              }}
                            >
                              Add to cart
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeWish(w.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses */}
          <TabsContent value="addresses" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Saved addresses</CardTitle>
                  <CardDescription>
                    Manage your shipping and billing addresses.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAddressDialog({ open: true })}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add address
                </Button>
              </CardHeader>
              <CardContent>
                {addressesLoading ? (
                  <AddressesSkeleton />
                ) : addresses.length === 0 ? (
                  <EmptyState
                    Icon={MapPin}
                    title="No addresses saved"
                    hint="Add an address for faster checkout."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <div key={a.id} className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{a.label}</p>
                            {a.isDefault && <Badge>Default</Badge>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setAddressDialog({ open: true, editing: a })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteAddress(a)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="font-medium text-foreground">
                            {a.fullName}
                          </p>
                          <p>{a.phone}</p>
                          {a.company && <p>{a.company}</p>}
                          <p>{a.line1}</p>
                          {a.deliveryArea && <p>Area: {a.deliveryArea}</p>}
                          <p>
                            {a.city}, {a.region} {a.postal}
                          </p>
                          <p>{a.country}</p>
                        </div>
                        {!a.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => setDefaultAddress(a.id)}
                          >
                            Set as default
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Available points',
                  value: rewards?.balance ?? 0,
                  detail: 'Ready to redeem at checkout',
                },
                {
                  label: 'Pending points',
                  value: rewards?.pendingPoints ?? 0,
                  detail: 'Credited after successful delivery',
                },
                {
                  label: 'Expiring soon',
                  value: rewards?.expiringPoints ?? 0,
                  detail: rewards?.nextExpiration
                    ? `Next expiry ${new Date(rewards.nextExpiration).toLocaleDateString()}`
                    : 'No upcoming expiration',
                },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="pb-2">
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className="text-2xl">
                      {rewardsLoading ? (
                        <Skeleton className="h-7 w-20" />
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {rewardsLoading ? (
                      <Skeleton className="h-3 w-36" />
                    ) : (
                      stat.detail
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Points activity</CardTitle>
                <CardDescription>
                  Earned points become available after delivery. Redeemed points
                  are restored when an order is cancelled or refunded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rewardsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((item) => (
                      <Skeleton key={item} className="h-14 w-full" />
                    ))}
                  </div>
                ) : !rewards?.transactions.length ? (
                  <EmptyState
                    Icon={Award}
                    title="No points activity yet"
                    hint="Eligible purchases will appear here after delivery."
                  />
                ) : (
                  <>
                    <div className="divide-y">
                      {rewards.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {transaction.reason || transaction.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                transaction.createdAt
                              ).toLocaleDateString()}
                              {transaction.expiresAt
                                ? ` · Expires ${new Date(transaction.expiresAt).toLocaleDateString()}`
                                : ''}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {transaction.points > 0 ? '+' : ''}
                            {transaction.points.toLocaleString()} points
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {rewards.pages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={rewardsPage <= 1}
                          onClick={() => setRewardsPage((page) => page - 1)}
                        >
                          Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {rewardsPage} of {rewards.pages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={rewardsPage >= rewards.pages}
                          onClick={() => setRewardsPage((page) => page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal information</CardTitle>
                  <CardDescription>Your account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Name" value={profile.name} />
                  <Row label="Email" value={profile.email} />
                  <Row label="Phone" value={profile.phone} />
                  <Button
                    className="mt-2"
                    onClick={() => setEditProfileOpen(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit profile
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Keep your account safe.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Password" value="••••••••••" />
                  <Row label="Two-factor auth" value="Disabled" />
                  <Button
                    variant="outline"
                    onClick={() => setChangePassOpen(true)}
                  >
                    <KeyRound className="mr-2 h-4 w-4" /> Change password
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit profile dialog */}
      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        initial={{ name: profile.name, phone: profile.phone }}
        onSave={saveProfile}
      />

      {/* Change password dialog */}
      <ChangePasswordDialog
        open={changePassOpen}
        onOpenChange={setChangePassOpen}
      />

      {/* Address dialog */}
      <AddressDialog
        state={addressDialog}
        onOpenChange={(open) =>
          setAddressDialog({
            open,
            editing: open ? addressDialog.editing : undefined,
          })
        }
        onSave={saveAddress}
      />

      {/* Order detail dialog */}
      <OrderViewDialog
        order={viewOrder}
        phone={user?.phone}
        onClose={() => setViewOrder(null)}
      />

      {/* Delete address */}
      <AlertDialog
        open={!!deleteAddress}
        onOpenChange={(o) => !o && setDeleteAddress(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete address?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{deleteAddress?.label}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAddress) removeAddress(deleteAddress.id);
                setDeleteAddress(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tone,
  loading = false,
}: {
  label: string;
  value: number;
  Icon: typeof Package;
  tone: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs text-gray-600">{label}</p>
          <div className="mt-1 text-2xl font-semibold">
            {loading ? <Skeleton className="h-7 w-12" /> : value}
          </div>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyState({
  Icon,
  title,
  hint,
}: {
  Icon: typeof Package;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <Icon className="h-10 w-10 text-gray-600" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-sm text-gray-600">{hint}</p>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="mt-2 h-3 w-28" />
          <Skeleton className="mt-2 h-3 w-40" />
          <div className="mt-3 space-y-2">
            {[0, 1].map((j) => (
              <div
                key={j}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <Skeleton className="h-14 w-14 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddressesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
          <Skeleton className="mt-2 h-3 w-3/5" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-4 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: z.infer<typeof profileSchema>;
  onSave: (v: z.infer<typeof profileSchema>) => void;
}) {
  const { user } = useAuth();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof initial, string>>
  >({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const fe: Partial<Record<keyof typeof initial, string>> = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof typeof initial;
        if (k && !fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    await onSave(parsed.data);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) {
          setValues(initial);
          setErrors({});
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your personal information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              value={values.phone}
              onChange={(e) => setValues({ ...values, phone: e.target.value })}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof values, string>>
  >({});
  const [show, setShow] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(values);
    if (!parsed.success) {
      const fe: Partial<Record<keyof typeof values, string>> = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof typeof values;
        if (k && !fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    try {
      await authApi.changePassword({
        currentPassword: values.current,
        newPassword: values.next,
      });
      toast.success('Password changed');
      onOpenChange(false);
      setValues({ current: '', next: '', confirm: '' });
      setErrors({});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Choose a strong password (min 8 characters).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {(['current', 'next', 'confirm'] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label>
                {k === 'current'
                  ? 'Current password'
                  : k === 'next'
                    ? 'New password'
                    : 'Confirm new password'}
              </Label>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={values[k]}
                  onChange={(e) =>
                    setValues({ ...values, [k]: e.target.value })
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                  aria-label={show ? 'Hide' : 'Show'}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors[k] && (
                <p className="text-xs text-destructive">{errors[k]}</p>
              )}
            </div>
          ))}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddressDialog({
  state,
  onOpenChange,
  onSave,
}: {
  state: { open: boolean; editing?: Address };
  onOpenChange: (o: boolean) => void;
  onSave: (v: z.infer<typeof addressSchema>, id?: string) => void;
}) {
  const [values, setValues] = useState(() => {
    if (!state.editing) return emptyAddressForm();
    const [firstName = '', ...lastName] = state.editing.fullName.split(/\s+/);
    return {
      ...state.editing,
      firstName,
      lastName: lastName.join(' '),
    };
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ReturnType<typeof emptyAddressForm>, string>>
  >({});

  useEffect(() => {
    if (!state.open) return;
    if (!state.editing) {
      setValues(emptyAddressForm());
    } else {
      const [firstName = '', ...lastName] = state.editing.fullName.split(/\s+/);
      setValues({
        ...state.editing,
        firstName,
        lastName: lastName.join(' '),
      });
    }
    setErrors({});
  }, [state.open, state.editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) {
      const fe: Partial<
        Record<keyof ReturnType<typeof emptyAddressForm>, string>
      > = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof ReturnType<typeof emptyAddressForm>;
        if (k && !fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    onSave(parsed.data, state.editing?.id);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={state.open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {state.editing ? 'Edit address' : 'Add address'}
          </DialogTitle>
          <DialogDescription>
            Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field
            label="First name"
            v={values.firstName}
            e={errors.firstName}
            onChange={(v) => setValues({ ...values, firstName: v })}
            required
          />
          <Field
            label="Last name"
            v={values.lastName}
            e={errors.lastName}
            onChange={(v) => setValues({ ...values, lastName: v })}
            required
          />
          <Field
            label="Company (optional)"
            v={values.company}
            e={errors.company}
            onChange={(v) => setValues({ ...values, company: v })}
            className="sm:col-span-2"
            placeholder="Company name"
          />
          <Field
            label="Phone"
            v={values.phone}
            e={errors.phone}
            onChange={(v) => setValues({ ...values, phone: v })}
            required
          />
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="address-line1" className="mb-1 block">
              Address <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="address-line1"
              value={values.line1}
              onChange={(e) => setValues({ ...values, line1: e.target.value })}
              placeholder="House number and street name"
              required
              rows={2}
            />
            {errors.line1 && (
              <p className="text-xs text-destructive">{errors.line1}</p>
            )}
          </div>
          <Field
            label="City"
            v={values.city}
            e={errors.city}
            onChange={(v) => setValues({ ...values, city: v })}
            required
            placeholder="Enter your city name"
          />
          <Field
            label="Postcode"
            v={values.postal}
            e={errors.postal}
            onChange={(v) => setValues({ ...values, postal: v })}
            required
          />
          <Field
            label="Country"
            v={values.country}
            e={errors.country}
            onChange={(v) => setValues({ ...values, country: v })}
            required
            placeholder="Country"
          />
          <Field
            label="Region / State"
            v={values.region}
            e={errors.region}
            onChange={(v) => setValues({ ...values, region: v })}
            required
          />
          <Field
            label="Address label (optional)"
            v={values.label}
            e={errors.label}
            onChange={(v) => setValues({ ...values, label: v })}
            placeholder="Home, Office..."
          />
          <Field
            label="Delivery area (optional)"
            v={values.deliveryArea}
            e={errors.deliveryArea}
            onChange={(v) => setValues({ ...values, deliveryArea: v })}
            placeholder="e.g. Chuadanga, Jibannagar..."
          />
          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {state.editing ? 'Save changes' : 'Add address'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderViewDialog({
  order,
  phone,
  onClose,
}: {
  order: Order | null;
  phone?: string;
  onClose: () => void;
}) {
  if (!order) return null;
  const meta = statusMeta[order.status] || statusMeta.pending;
  const Icon = meta.Icon;
  const steps = buildTimeline(order, phone);
  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const couponDiscount = order.coupon?.discount || 0;
  const pointsDiscount = order.loyalty?.discount || 0;
  const advancePaid = order.advancePaid || 0;
  const due = Math.max(0, order.total - advancePaid);

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>
              Order {order.orderNumber || order.id.slice(-6).toUpperCase()}
            </DialogTitle>
            <Badge variant="secondary" className={meta.className}>
              <Icon className="mr-1 h-3 w-3" />
              {meta.label}
            </Badge>
          </div>
          <DialogDescription>Placed on {fmtDate(order.date)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: order details */}
          <div className="space-y-4 md:col-span-2">
            {/* Section 1: order info */}
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-600">
                Order information
              </p>
              <p className="mt-1 font-medium">
                {order.orderNumber || `#${order.id.slice(-6).toUpperCase()}`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span>Status: {meta.label}</span>
                <span>·</span>
                <span>
                  Payment:{' '}
                  {order.payment
                    ? `${order.payment.method.toUpperCase()} (${order.payment.status})`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Section 2: shipping + summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-gray-600">
                  Shipping address
                </p>
                <div className="mt-2 space-y-0.5 text-sm">
                  <p className="font-medium">
                    {order.shippingAddress?.street || '—'}
                  </p>
                  <p className="text-gray-600">
                    {[
                      order.shippingAddress?.city,
                      order.shippingAddress?.state,
                      order.shippingAddress?.postcode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="text-gray-600">
                    {order.shippingAddress?.country}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-gray-600">
                  Order summary
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>৳{subtotal.toLocaleString()}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Coupon ({order.coupon?.code})
                      </span>
                      <span className="text-green-600">
                        -৳{couponDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Reward points ({order.loyalty?.pointsRedeemed ?? 0})
                      </span>
                      <span className="text-green-600">
                        -৳{pointsDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {(order.shippingFee ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span>৳{order.shippingFee?.toLocaleString()}</span>
                    </div>
                  )}
                  {(order.loyalty?.pointsEarned ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Points earned</span>
                      <span className="font-medium text-amber-700">
                        +{order.loyalty?.pointsEarned?.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {advancePaid > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Advance paid</span>
                      <span>৳{advancePaid.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>৳{order.total.toLocaleString()}</span>
                  </div>
                  {advancePaid > 0 && due > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due on delivery</span>
                      <span>৳{due.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: products */}
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-gray-600">
                Products
              </p>
              <div className="space-y-2">
                {order.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-md border p-2"
                  >
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.name}
                        className="h-12 w-12 shrink-0 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-100">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.name}</p>
                      {(it.variantLabel || it.sku) && (
                        <p className="truncate text-xs text-gray-500">
                          {[it.variantLabel, it.sku && `SKU: ${it.sku}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-600">
                        ৳{it.price.toLocaleString()} × {it.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      ৳{(it.price * it.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: order history */}
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Order History</p>
            <ol className="space-y-0">
              {steps.map((s, i) => {
                const last = i === steps.length - 1;
                const dot =
                  s.state === 'done'
                    ? 'border-green-500 bg-green-500 text-white'
                    : s.state === 'current'
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-muted-foreground/30 bg-background text-gray-600';
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${dot}`}
                      >
                        {s.state === 'done' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : s.state === 'current' ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      {!last && <span className="my-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className={last ? 'pb-0' : 'pb-4'}>
                      <p className="text-sm font-medium">{s.title}</p>
                      {s.description && (
                        <p className="text-xs text-gray-600">{s.description}</p>
                      )}
                      {s.date && (
                        <p className="mt-0.5 text-xs text-gray-600/70">
                          {s.date}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  v,
  e,
  onChange,
  placeholder,
  required = false,
  className,
}: {
  label: string;
  v: string;
  e?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={inputId}
        value={v}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={placeholder}
        required={required}
      />
      {e && <p className="text-xs text-destructive">{e}</p>}
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}
