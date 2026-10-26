'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <h1 className="text-8xl font-bold tracking-tight">404</h1>

        <h2 className="text-2xl font-semibold">Page not found</h2>

        <p className="text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>

        <div className="flex justify-center gap-3">
          <Button render={<Link href="/">Go Home</Link>} variant="outline" />

          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </main>
  );
}
