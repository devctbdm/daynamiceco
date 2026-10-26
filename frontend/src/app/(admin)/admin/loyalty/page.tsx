'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, Coins, Gift, Search, Settings2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  loyaltyApi,
  type LoyaltyCustomer,
  type LoyaltySettings,
  type LoyaltyTransaction,
} from '@/lib/api';

const DEFAULT_SETTINGS: LoyaltySettings = {
  enabled: true,
  pointsPerHundred: 1,
  pointValue: 0.1,
  minimumRedemption: 500,
  maximumRedemptionPercent: 10,
  expirationDays: 365,
  productOverrides: [],
  categoryOverrides: [],
};

const NUMERIC_FIELDS: {
  key:
    | 'pointsPerHundred'
    | 'pointValue'
    | 'minimumRedemption'
    | 'maximumRedemptionPercent'
    | 'expirationDays';
  label: string;
  min: number;
  step: number;
}[] = [
  { key: 'pointsPerHundred', label: 'Points per ৳100', min: 0, step: 2 },
  { key: 'pointValue', label: 'Value per point (৳)', min: 0.0001, step: 0.01 },
  {
    key: 'minimumRedemption',
    label: 'Minimum redemption (points)',
    min: 0,
    step: 1,
  },
  {
    key: 'maximumRedemptionPercent',
    label: 'Maximum discount (%)',
    min: 0,
    step: 0.1,
  },
  {
    key: 'expirationDays',
    label: 'Expiration (days; 0 = never)',
    min: 0,
    step: 1,
  },
];

type CustomerRewards = {
  customer: { _id: string; name: string; email: string; phone: string };
  balance: number;
  pendingPoints: number;
  expiringPoints: number;
  nextExpiration: string | null;
  transactions: LoyaltyTransaction[];
  total: number;
  pages: number;
};

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeZone: 'Asia/Dhaka',
      }).format(new Date(value))
    : '—';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function LoyaltyAdminPage() {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [summary, setSummary] = useState<{
    customers: number;
    activePoints: number;
    pointsEarned: number;
    pointsRedeemed: number;
    manualAdjustments: number;
  } | null>(null);
  const [productOverridesText, setProductOverridesText] = useState('[]');
  const [categoryOverridesText, setCategoryOverridesText] = useState('[]');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerPages, setCustomerPages] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [customerRewards, setCustomerRewards] =
    useState<CustomerRewards | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerHistoryPage, setCustomerHistoryPage] = useState(1);
  const [adjustmentPoints, setAdjustmentPoints] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadSummaryAndSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResponse, summaryResponse] = await Promise.all([
        loyaltyApi.adminSettings(),
        loyaltyApi.adminSummary(),
      ]);
      const loaded = settingsResponse.data.settings;
      setSettings(loaded);
      setProductOverridesText(JSON.stringify(loaded.productOverrides, null, 2));
      setCategoryOverridesText(
        JSON.stringify(loaded.categoryOverrides, null, 2)
      );
      setSummary(summaryResponse.data.summary);
    } catch (error) {
      toast.error(messageFrom(error, 'Failed to load loyalty settings'));
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const { data } = await loyaltyApi.customers({
        page: customerPage,
        limit: 10,
        search: search || undefined,
      });
      setCustomers(data.customers);
      setCustomerTotal(data.total);
      setCustomerPages(data.pages);
    } catch (error) {
      toast.error(messageFrom(error, 'Failed to load customers'));
    } finally {
      setCustomersLoading(false);
    }
  }, [customerPage, search]);

  const loadCustomerRewards = useCallback(async (id: string, page = 1) => {
    if (!id) return;
    setCustomerLoading(true);
    try {
      const { data } = await loyaltyApi.customer(id, { page, limit: 20 });
      setCustomerRewards({
        customer: data.customer,
        balance: data.balance,
        pendingPoints: data.pendingPoints,
        expiringPoints: data.expiringPoints,
        nextExpiration: data.nextExpiration,
        transactions: data.transactions,
        total: data.total,
        pages: data.pages,
      });
    } catch (error) {
      toast.error(messageFrom(error, 'Failed to load customer rewards'));
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummaryAndSettings();
  }, [loadSummaryAndSettings]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setCustomerPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (selectedId) void loadCustomerRewards(selectedId, customerHistoryPage);
  }, [selectedId, customerHistoryPage, loadCustomerRewards]);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const productOverrides = JSON.parse(productOverridesText);
      const categoryOverrides = JSON.parse(categoryOverridesText);
      const { data } = await loyaltyApi.saveSettings({
        ...settings,
        productOverrides,
        categoryOverrides,
      });
      setSettings(data.settings);
      toast.success('Loyalty settings saved');
    } catch (error) {
      toast.error(messageFrom(error, 'Check override JSON and try again'));
    } finally {
      setSavingSettings(false);
    }
  };

  const adjustPoints = async () => {
    if (!selectedId) return;
    const points = Number(adjustmentPoints);
    if (
      !Number.isSafeInteger(points) ||
      points === 0 ||
      !adjustmentReason.trim()
    ) {
      toast.error('Enter a non-zero whole-point amount and a reason');
      return;
    }
    setAdjusting(true);
    try {
      await loyaltyApi.adjust(selectedId, {
        points,
        reason: adjustmentReason.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      setAdjustmentPoints('');
      setAdjustmentReason('');
      toast.success('Points adjusted');
      await Promise.all([
        loadCustomerRewards(selectedId, customerHistoryPage),
        loadCustomers(),
      ]);
      const { data } = await loyaltyApi.adminSummary();
      setSummary(data.summary);
    } catch (error) {
      toast.error(messageFrom(error, 'Unable to adjust points'));
    } finally {
      setAdjusting(false);
    }
  };

  const updateNumber = (
    key: Exclude<
      keyof LoyaltySettings,
      'enabled' | 'productOverrides' | 'categoryOverrides'
    >,
    value: string
  ) => {
    setSettings((current) =>
      current
        ? { ...current, [key]: value === '' ? 0 : Number(value) }
        : current
    );
  };

  return (
    <div className="space-y-6 px-4 pb-8">
      <SiteHeader />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Loyalty &amp; Rewards
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure points, review customer activity, and make auditable
          adjustments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Customers', value: summary?.customers, Icon: Users },
          {
            label: 'Active point balance',
            value: summary?.activePoints,
            Icon: Coins,
          },
          { label: 'Points earned', value: summary?.pointsEarned, Icon: Award },
          {
            label: 'Points redeemed',
            value: summary?.pointsRedeemed,
            Icon: Gift,
          },
          {
            label: 'Manual adjustments',
            value: summary?.manualAdjustments,
            Icon: Settings2,
          },
        ].map(({ label, value, Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{label}</CardDescription>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-semibold">
                  {formatNumber(value ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Reward rules
          </CardTitle>
          <CardDescription>
            Points are credited only when an order is marked delivered. Set a
            product or category rate to 0 to exclude low-margin items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading || !settings ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((key) => (
                <Skeleton key={key} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <label className="flex items-center gap-3 rounded-lg border p-4">
                <Checkbox
                  checked={settings.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enabled: checked === true })
                  }
                />
                <span>
                  <span className="block text-sm font-medium">
                    Enable rewards
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Turn earning and redemption on or off store-wide.
                  </span>
                </span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {NUMERIC_FIELDS.map(({ key, label, min, step }) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      min={min}
                      step={step}
                      value={settings[key]}
                      onChange={(event) =>
                        updateNumber(key, event.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-overrides">
                    Product earning overrides
                  </Label>
                  <Textarea
                    id="product-overrides"
                    rows={6}
                    value={productOverridesText}
                    onChange={(event) =>
                      setProductOverridesText(event.target.value)
                    }
                    placeholder='[{"productId":"...","pointsPerHundred":0,"enabled":true}]'
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON array: productId, pointsPerHundred, enabled.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-overrides">
                    Category earning overrides
                  </Label>
                  <Textarea
                    id="category-overrides"
                    rows={6}
                    value={categoryOverridesText}
                    onChange={(event) =>
                      setCategoryOverridesText(event.target.value)
                    }
                    placeholder='[{"categoryId":"...","pointsPerHundred":0.5,"enabled":true}]'
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Product-specific overrides take precedence over category
                    rules.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings ? 'Saving…' : 'Save reward rules'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Customer points</CardTitle>
            <CardDescription>
              {formatNumber(customerTotal)} customer accounts
            </CardDescription>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search customers"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {customersLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-12 w-full" />
                ))}
              </div>
            ) : !customers.length ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No customers found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow
                        key={customer._id}
                        data-state={
                          selectedId === customer._id ? 'selected' : undefined
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          setCustomerHistoryPage(1);
                          setSelectedId(customer._id);
                        }}
                      >
                        <TableCell>
                          <span className="block font-medium">
                            {customer.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {customer.email}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(customer.loyaltyBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {customerPage} of {customerPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={customerPage <= 1}
                  onClick={() => setCustomerPage((page) => page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={customerPage >= customerPages}
                  onClick={() => setCustomerPage((page) => page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer ledger</CardTitle>
            <CardDescription>
              Inspect balance, expiration and append-only transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select a customer to view their point balance and activity.
              </p>
            ) : customerLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((key) => (
                  <Skeleton key={key} className="h-14 w-full" />
                ))}
              </div>
            ) : customerRewards ? (
              <div className="space-y-5">
                <div>
                  <p className="font-semibold">
                    {customerRewards.customer.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {customerRewards.customer.email}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted p-3">
                    Available{' '}
                    <strong className="block text-lg">
                      {formatNumber(customerRewards.balance)}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    Pending{' '}
                    <strong className="block text-lg">
                      {formatNumber(customerRewards.pendingPoints)}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    Expiring soon{' '}
                    <strong className="block text-lg">
                      {formatNumber(customerRewards.expiringPoints)}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    Next expiry{' '}
                    <strong className="block text-sm">
                      {formatDate(customerRewards.nextExpiration)}
                    </strong>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border p-4">
                  <p className="text-sm font-semibold">Manual adjustment</p>
                  <p className="text-xs text-muted-foreground">
                    Use a positive or negative whole number and record the
                    reason.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                    <Input
                      type="number"
                      step={1}
                      value={adjustmentPoints}
                      onChange={(event) =>
                        setAdjustmentPoints(event.target.value)
                      }
                      placeholder="e.g. 100"
                    />
                    <Input
                      value={adjustmentReason}
                      onChange={(event) =>
                        setAdjustmentReason(event.target.value)
                      }
                      placeholder="Reason for adjustment"
                      maxLength={500}
                    />
                  </div>
                  <Button size="sm" onClick={adjustPoints} disabled={adjusting}>
                    {adjusting ? 'Applying…' : 'Apply adjustment'}
                  </Button>
                </div>
                {customerRewards.transactions.length ? (
                  <div className="max-h-80 divide-y overflow-y-auto">
                    {customerRewards.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {transaction.reason}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {transaction.points > 0 ? '+' : ''}
                          {formatNumber(transaction.points)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No transactions for this customer yet.
                  </p>
                )}
                {customerRewards.pages > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Activity page {customerHistoryPage} of{' '}
                      {customerRewards.pages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={customerHistoryPage <= 1}
                        onClick={() =>
                          setCustomerHistoryPage((page) => page - 1)
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={customerHistoryPage >= customerRewards.pages}
                        onClick={() =>
                          setCustomerHistoryPage((page) => page + 1)
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unable to load this customer&apos;s reward details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
