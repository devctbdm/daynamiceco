'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  CreditCard,
  Wallet,
  Smartphone,
  Truck,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { paymentSettingsApi, type PaymentGateway } from '@/lib/api';
import { SiteHeader } from '@/components/site-header';

type SslCommerz = {
  status: boolean;
  description: string;
  sandbox: boolean;
  storeId: string;
  storePassword: string;
};

type Bkash = {
  status: boolean;
  label: string;
  sandbox: boolean;
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
};

type Nagad = {
  status: boolean;
  label: string;
  description: string;
  sandbox: boolean;
  merchantId: string;
  merchantNumber: string;
  publicKey: string;
  privateKey: string;
};

type Cod = {
  status: boolean;
  label: string;
  description: string;
  minOrder: string;
  maxOrder: string;
  extraCharge: string;
};

type Settings = {
  sslcommerz: SslCommerz;
  bkash: Bkash;
  nagad: Nagad;
  cod: Cod;
};

function SecretInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Hide value' : 'Show value'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusRow({
  status,
  sandbox,
  onStatus,
  onSandbox,
  idPrefix,
}: {
  status: boolean;
  sandbox: boolean;
  onStatus: (v: boolean) => void;
  onSandbox: (v: boolean) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor={`${idPrefix}-status`} className="text-sm font-medium">
            Status
          </Label>
          <p className="text-xs text-muted-foreground">
            Enable this method at checkout
          </p>
        </div>
        <Switch
          id={`${idPrefix}-status`}
          checked={status}
          onCheckedChange={onStatus}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label
            htmlFor={`${idPrefix}-sandbox`}
            className="text-sm font-medium"
          >
            Sandbox mode
          </Label>
          <p className="text-xs text-muted-foreground">
            Use test credentials, no real money
          </p>
        </div>
        <Switch
          id={`${idPrefix}-sandbox`}
          checked={sandbox}
          onCheckedChange={onSandbox}
        />
      </div>
    </div>
  );
}

export default function AdminPaymentPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const enabledCount = useMemo(
    () =>
      settings
        ? [
            settings!.sslcommerz.status,
            settings!.bkash.status,
            settings!.nagad.status,
            settings!.cod.status,
          ].filter(Boolean).length
        : 0,
    [settings]
  );

  const sandboxCount = useMemo(
    () =>
      settings
        ? [
            settings!.sslcommerz.sandbox,
            settings!.bkash.sandbox,
            settings!.nagad.sandbox,
          ].filter(Boolean).length
        : 0,
    [settings]
  );

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await paymentSettingsApi.getAll();
      const gateways = data.gateways || [];
      const byName = Object.fromEntries(gateways.map((g) => [g.name, g]));
      setSettings({
        sslcommerz: {
          status: byName['sslcommerz']?.enabled ?? true,
          description:
            byName['sslcommerz']?.config?.description ??
            'Pay with cards and mobile wallets.',
          sandbox: byName['sslcommerz']?.config?.sandbox ?? true,
          storeId: byName['sslcommerz']?.config?.storeId ?? '',
          storePassword: byName['sslcommerz']?.config?.storePassword ?? '',
        },
        bkash: {
          status: byName['bkash']?.enabled ?? true,
          label: byName['bkash']?.config?.label ?? 'bKash',
          sandbox: byName['bkash']?.config?.sandbox ?? true,
          appKey: byName['bkash']?.config?.appKey ?? '',
          appSecret: byName['bkash']?.config?.appSecret ?? '',
          username: byName['bkash']?.config?.username ?? '',
          password: byName['bkash']?.config?.password ?? '',
        },
        nagad: {
          status: byName['nagad']?.enabled ?? false,
          label: byName['nagad']?.config?.label ?? 'Nagad',
          description:
            byName['nagad']?.config?.description ??
            'Pay with your Nagad mobile wallet.',
          sandbox: byName['nagad']?.config?.sandbox ?? true,
          merchantId: byName['nagad']?.config?.merchantId ?? '',
          merchantNumber: byName['nagad']?.config?.merchantNumber ?? '',
          publicKey: byName['nagad']?.config?.publicKey ?? '',
          privateKey: byName['nagad']?.config?.privateKey ?? '',
        },
        cod: {
          status: byName['cod']?.enabled ?? true,
          label: byName['cod']?.config?.label ?? 'Cash on Delivery',
          description:
            byName['cod']?.config?.description ??
            'Pay in cash when the order is delivered to your address.',
          minOrder: byName['cod']?.config?.minOrder ?? '0',
          maxOrder: byName['cod']?.config?.maxOrder ?? '50000',
          extraCharge: byName['cod']?.config?.extraCharge ?? '0',
        },
      });
    } catch {
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function update<K extends keyof Settings>(
    key: K,
    patch: Partial<Settings[K]>
  ) {
    setSettings((s) => (s ? { ...s, [key]: { ...s[key], ...patch } } : s));
  }

  async function save(key: keyof Settings, name: string) {
    setSaving(key);
    try {
      const s = settings![key] as any;
      const payload: { enabled: boolean; config: Record<string, any> } = {
        enabled: s.status,
        config: {},
      };
      switch (key) {
        case 'sslcommerz':
          payload.config = {
            description: s.description,
            sandbox: s.sandbox,
            storeId: s.storeId,
            storePassword: s.storePassword,
          };
          break;
        case 'cod':
          payload.config = {
            label: s.label,
            description: s.description,
            minOrder: s.minOrder,
            maxOrder: s.maxOrder,
            extraCharge: s.extraCharge,
          };
          break;
      }
      await paymentSettingsApi.update(key, payload);
      toast.success(`${name} settings saved`);
    } catch {
      toast.error(`Failed to save ${name} settings`);
    } finally {
      setSaving(null);
    }
  }

  function reset(key: keyof Settings, name: string) {
    loadSettings();
    toast.info(`${name} settings reset`);
  }

  const stats = [
    {
      label: 'Payment methods',
      value: 4,
      icon: CreditCard,
    },
    { label: 'Enabled', value: enabledCount, icon: CheckCircle2 },
    { label: 'Disabled', value: 4 - enabledCount, icon: XCircle },
    { label: 'In sandbox', value: sandboxCount, icon: FlaskConical },
  ];

  function Actions({
    methodKey,
    name,
  }: {
    methodKey: keyof Settings;
    name: string;
  }) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => reset(methodKey, name)}>
          <RotateCcw className="mr-2 size-4" />
          Reset
        </Button>
        <Button
          onClick={() => save(methodKey, name)}
          disabled={saving === methodKey}
        >
          <Save className="mr-2 size-4" />
          {saving === methodKey ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="space-y-6 p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading payment settings…
          </div>
        ) : (
          <>
            <header className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Payment management
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure Bangladeshi payment gateways — SSLCommerz, bKash,
                Nagad and Cash on Delivery.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-semibold">{s.value}</p>
                    </div>
                    <s.icon className="size-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="sslcommerz" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="sslcommerz">
                  <CreditCard className="mr-2 size-4" /> SSLCommerz
                </TabsTrigger>

                <TabsTrigger value="cod">
                  <Truck className="mr-2 size-4" /> Cash on Delivery
                </TabsTrigger>
              </TabsList>

              {/* SSLCommerz */}
              <TabsContent value="sslcommerz" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          SSLCommerz
                          <Badge
                            variant={
                              settings!.sslcommerz.status
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {settings!.sslcommerz.status
                              ? 'Enabled'
                              : 'Disabled'}
                          </Badge>
                          {settings!.sslcommerz.sandbox && (
                            <Badge variant="outline">Sandbox</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Cards, internet banking and mobile banking aggregator.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <StatusRow
                      idPrefix="ssl"
                      status={settings!.sslcommerz.status}
                      sandbox={settings!.sslcommerz.sandbox}
                      onStatus={(v) => update('sslcommerz', { status: v })}
                      onSandbox={(v) => update('sslcommerz', { sandbox: v })}
                    />
                    <Field
                      label="Description"
                      htmlFor="ssl-desc"
                      hint="Shown to the customer on the checkout page."
                    >
                      <Textarea
                        id="ssl-desc"
                        rows={3}
                        value={settings!.sslcommerz.description}
                        onChange={(e) =>
                          update('sslcommerz', { description: e.target.value })
                        }
                      />
                    </Field>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Store ID" htmlFor="ssl-store-id">
                        <Input
                          id="ssl-store-id"
                          className="font-mono"
                          value={settings!.sslcommerz.storeId}
                          onChange={(e) =>
                            update('sslcommerz', { storeId: e.target.value })
                          }
                          placeholder="yourstore0live"
                        />
                      </Field>
                      <Field label="Store Password" htmlFor="ssl-store-pass">
                        <SecretInput
                          id="ssl-store-pass"
                          value={settings!.sslcommerz.storePassword}
                          onChange={(v) =>
                            update('sslcommerz', { storePassword: v })
                          }
                          placeholder="yourstore0live@ssl"
                        />
                      </Field>
                    </div>
                    <Actions methodKey="sslcommerz" name="SSLCommerz" />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cash on Delivery */}
              <TabsContent value="cod" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Cash on Delivery
                      <Badge
                        variant={settings!.cod.status ? 'default' : 'secondary'}
                      >
                        {settings!.cod.status ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Collect payment in cash when the order is handed over.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label
                          htmlFor="cod-status"
                          className="text-sm font-medium"
                        >
                          Status
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Enable this method at checkout
                        </p>
                      </div>
                      <Switch
                        id="cod-status"
                        checked={settings!.cod.status}
                        onCheckedChange={(v) => update('cod', { status: v })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Label" htmlFor="cod-label">
                        <Input
                          id="cod-label"
                          value={settings!.cod.label}
                          onChange={(e) =>
                            update('cod', { label: e.target.value })
                          }
                        />
                      </Field>
                      <Field
                        label="Extra charge (৳)"
                        htmlFor="cod-charge"
                        hint="Handling fee added to COD orders."
                      >
                        <Input
                          id="cod-charge"
                          inputMode="numeric"
                          value={settings!.cod.extraCharge}
                          onChange={(e) =>
                            update('cod', { extraCharge: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Minimum order (৳)" htmlFor="cod-min">
                        <Input
                          id="cod-min"
                          inputMode="numeric"
                          value={settings!.cod.minOrder}
                          onChange={(e) =>
                            update('cod', { minOrder: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Maximum order (৳)" htmlFor="cod-max">
                        <Input
                          id="cod-max"
                          inputMode="numeric"
                          value={settings!.cod.maxOrder}
                          onChange={(e) =>
                            update('cod', { maxOrder: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Description" htmlFor="cod-desc">
                      <Textarea
                        id="cod-desc"
                        rows={3}
                        value={settings!.cod.description}
                        onChange={(e) =>
                          update('cod', { description: e.target.value })
                        }
                      />
                    </Field>
                    <Actions methodKey="cod" name="Cash on Delivery" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}
