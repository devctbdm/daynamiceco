'use client';

import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { metaApi, type MetaCatalogStatus } from '@/lib/api';
import { Globe2, KeyRound, ServerCog } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const requiredVariables = [
  'META_CATALOG_SYNC_ENABLED',
  'META_API_VERSION',
  'META_BUSINESS_ID',
  'META_CATALOG_ID',
  'META_ACCESS_TOKEN',
];

export default function MetaCatalogPage() {
  const [status, setStatus] = useState<MetaCatalogStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    setStatus(null);
    try {
      const response = await metaApi.getStatus();
      setStatus(response.data);
      if (response.data.connected) toast.success(response.data.message);
      else toast.warning(response.data.message);
    } catch (error: any) {
      const data = error?.response?.data as MetaCatalogStatus | undefined;
      setStatus(
        data || {
          success: false,
          connected: false,
          enabled: false,
          message: 'Could not check Meta catalog connection.',
        }
      );
      toast.error(data?.message || 'Could not check Meta catalog connection.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Meta Catalog</h1>
            <Badge variant="secondary">Super admin</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage the connection used to synchronize products with Meta
            Commerce Manager.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <ServerCog className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Backend configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Meta credentials belong in the backend environment and are never
              exposed to the browser.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Access token</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use a long-lived System User token with permission to manage this
              catalog.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Globe2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Catalog sync</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Product sync controls can be connected here after the backend Meta
              API endpoints are enabled.
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Connection test</CardTitle>
              <Button onClick={checkConnection} disabled={checking}>
                {checking ? 'Checking...' : 'Test Meta connection'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {status && (
              <div
                className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                  status.connected
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700'
                }`}
              >
                <p className="font-medium">{status.message}</p>
                {status.catalog && (
                  <p className="mt-1">
                    Catalog: {status.catalog.name || status.catalog.id}
                    {status.catalog.productCount !== null &&
                      ` | ${status.catalog.productCount} products`}
                  </p>
                )}
              </div>
            )}
            <h2 className="mb-3 text-sm font-medium">
              Required backend environment variables
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {requiredVariables.map((variable) => (
                <code
                  key={variable}
                  className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
                >
                  {variable}
                </code>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Configure these in <code>backend/.env</code> locally and in the
              backend service environment on Render.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
