'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  CreditCard,
  Truck,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { paymentSettingsApi, type SSLCommerzConfigStatus } from '@/lib/api';
import { SiteHeader } from '@/components/site-header';

type SslCommerz = {
  status: boolean;
};

type Bkash = {
  status: boolean;
};

type Nagad = {
  status: boolean;
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
  onStatus,
  idPrefix,
}: {
  status: boolean;
  onStatus: (v: boolean) => void;
  idPrefix: string;
}) {
  return (
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
  );
}

export default function AdminPaymentPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [sslConfig, setSslConfig] = useState<SSLCommerzConfigStatus | null>(
    null
  );

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

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await paymentSettingsApi.getAll();
      setSslConfig(data.sslcommerzConfig);
      const gateways = data.gateways || [];
      const byName = Object.fromEntries(gateways.map((g) => [g.name, g]));
      setSettings({
        sslcommerz: {
          status: byName['sslcommerz']?.enabled ?? true,
        },
        bkash: {
          status: byName['bkash']?.enabled ?? true,
        },
        nagad: {
          status: byName['nagad']?.enabled ?? false,
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
    const currentSettings = settings;
    if (!currentSettings) return;

    setSaving(key);
    try {
      const payload: {
        enabled: boolean;
        config?: Record<string, string>;
      } = {
        enabled: currentSettings[key].status,
      };
      if (key === 'cod') {
        const cod = currentSettings.cod;
        payload.config = {
          label: cod.label,
          description: cod.description,
          minOrder: cod.minOrder,
          maxOrder: cod.maxOrder,
          extraCharge: cod.extraCharge,
        };
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
                Enable or disable checkout payment methods. SSLCommerz
                credentials and test/live mode are controlled by backend
                environment variables.
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
                            className={
                              sslConfig?.configured
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                : ''
                            }
                            variant={
                              sslConfig?.configured ? 'outline' : 'destructive'
                            }
                          >
                            {sslConfig?.configured
                              ? 'Configured'
                              : 'Not configured'}
                          </Badge>
                          <Badge variant="secondary">
                            {sslConfig?.mode
                              ? sslConfig.mode === 'live'
                                ? 'Live mode'
                                : 'Sandbox mode'
                              : 'Mode not set'}
                          </Badge>
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
                        </CardTitle>
                        <CardDescription>
                          Cards, internet banking and mobile banking aggregator.
                          Credentials and test/live mode are not editable here.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <StatusRow
                      idPrefix="ssl"
                      status={settings!.sslcommerz.status}
                      onStatus={(v) => update('sslcommerz', { status: v })}
                    />
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
