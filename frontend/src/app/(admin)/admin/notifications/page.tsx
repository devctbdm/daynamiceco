'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Package,
  Truck,
  User,
  Megaphone,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  notificationApi,
  type AdminNotification,
  type AdminNotificationCategory,
} from '@/lib/api';
import { getSocket } from '@/lib/socket';

type Filter = 'all' | 'unread' | 'orders';

const PAGE_SIZE = 5;

const categoryIcon: Record<AdminNotificationCategory, React.ElementType> = {
  order: Package,
  delivery: Truck,
  rider: User,
  payment: CreditCard,
  system: Megaphone,
};

const categoryColor: Record<AdminNotificationCategory, string> = {
  order: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  delivery:
    'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  rider:
    'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  payment:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  system: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}

// Absolute, human-readable date & time with AM/PM (e.g. "22 Aug 2026, 03:45 PM").
function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${date}, ${time}`;
}

// Build a compact page list with ellipsis for many pages.
function getPageItems(
  current: number,
  totalPages: number
): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push('ellipsis');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [newOrdersEnabled, setNewOrdersEnabled] = useState(true);
  const [advancePaymentEnabled, setAdvancePaymentEnabled] = useState(true);
  const [deliveryUpdatesEnabled, setDeliveryUpdatesEnabled] = useState(true);
  const [riderUpdatesEnabled, setRiderUpdatesEnabled] = useState(true);
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);

  const loadPage = (p = page, f = filter) => {
    const params: Record<string, unknown> = { page: p, limit: PAGE_SIZE };
    if (f === 'unread') params.read = 'false';
    if (f === 'orders') params.category = 'order';

    notificationApi
      .list(params)
      .then((res) => {
        if (res.data.success) {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.unreadCount);
          setTotal(res.data.total);
          setPages(res.data.pages);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadOrderCount = () => {
    notificationApi
      .list({ category: 'order', limit: 1 })
      .then((res) => {
        if (res.data.success) setOrderCount(res.data.total);
      })
      .catch(() => {});
  };

  // Keep refs to the latest loaders for the socket handler (avoids stale state).
  const loadPageRef = useRef(loadPage);
  const loadOrderCountRef = useRef(loadOrderCount);
  useEffect(() => {
    loadPageRef.current = loadPage;
    loadOrderCountRef.current = loadOrderCount;
  });

  // Reload whenever page or filter changes.
  useEffect(() => {
    loadPage();
  }, [page, filter]);

  // Initial order-count load + live updates over Socket.io.
  useEffect(() => {
    loadOrderCount();

    const socket = getSocket();
    const onNew = () => {
      loadPageRef.current();
      loadOrderCountRef.current?.();
    };
    socket.on('notification:new', onNew);

    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

  const goToPage = (p: number) => {
    if (p < 1 || p > pages) return;
    setPage(p);
  };

  const pageItems = useMemo(() => getPageItems(page, pages), [page, pages]);

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationApi.markAllRead();
      toast.success('All notifications marked as read');
      window.dispatchEvent(new Event('notifications-updated'));
      loadPage();
      loadOrderCount();
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationApi.markRead(id);
      window.dispatchEvent(new Event('notifications-updated'));
      loadPage();
      loadOrderCount();
    } catch {
      // optimistic update already applied; ignore network failure
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Stay updated with orders, deliveries and rider activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: notifications list */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-col gap-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">Notifications</CardTitle>
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/10"
                      >
                        {unreadCount}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Order, delivery and rider activity for your account.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all as read
                </Button>
              </div>

              <Tabs
                value={filter}
                onValueChange={(v) => {
                  setFilter(v as Filter);
                  setPage(1);
                }}
                className="w-full"
              >
                <TabsList className="w-full justify-start sm:w-auto">
                  <TabsTrigger value="all" className="flex-1 sm:flex-initial">
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="unread"
                    className="flex-1 sm:flex-initial"
                  >
                    Unread ({unreadCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="flex-1 sm:flex-initial"
                  >
                    Orders ({orderCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="pt-0">
              <ScrollArea className="h-130 pr-3">
                {loading ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                    <Bell className="mb-3 h-10 w-10 opacity-20" />
                    <p>Loading notifications…</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                    <Bell className="mb-3 h-10 w-10 opacity-20" />
                    <p>No notifications found.</p>
                    <p className="text-sm">You are all caught up.</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    <div className="space-y-2">
                      {notifications.map((n) => {
                        const Icon = categoryIcon[n.category];
                        return (
                          <motion.div
                            key={n._id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => markAsRead(n._id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ')
                                markAsRead(n._id);
                            }}
                            className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-colors hover:bg-accent/50 ${
                              n.read ? 'opacity-80' : 'bg-accent/30'
                            }`}
                          >
                            {!n.read && (
                              <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary" />
                            )}
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${categoryColor[n.category]}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium leading-tight">
                                  {n.title}
                                </p>
                                <span className="text-xs whitespace-nowrap text-muted-foreground">
                                  {timeAgo(n.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {n.description}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground/70">
                                {formatDateTime(n.createdAt)}
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {n.category}
                                </Badge>
                                {!n.read && (
                                  <span className="text-xs font-medium text-primary">
                                    New
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </AnimatePresence>
                )}
              </ScrollArea>

              {pages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    {page > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            goToPage(page - 1);
                          }}
                        />
                      </PaginationItem>
                    )}
                    {pageItems.map((p) =>
                      p === 'ellipsis' ? (
                        <PaginationItem key="ellipsis">
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault();
                              goToPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    {page < pages && (
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            goToPage(page + 1);
                          }}
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  Notification settings
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="new-orders" className="font-medium">
                    New orders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when a new order is placed.
                  </p>
                </div>
                <Switch
                  id="new-orders"
                  checked={newOrdersEnabled}
                  onCheckedChange={setNewOrdersEnabled}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="advance-payment" className="font-medium">
                    Advance payment notification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Alerts for partial and full advance payments.
                  </p>
                </div>
                <Switch
                  id="advance-payment"
                  checked={advancePaymentEnabled}
                  onCheckedChange={setAdvancePaymentEnabled}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="promotions" className="font-medium">
                    Promotions & system
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Low stock and platform announcements.
                  </p>
                </div>
                <Switch
                  id="promotions"
                  checked={promotionsEnabled}
                  onCheckedChange={setPromotionsEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
