'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const NotFound = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a loading delay (e.g., while checking auth or fetching data)
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-50 via-purple-50 to-slate-100">
      {/* Decorative glowing orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-300/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="relative max-w-2xl rounded-3xl border border-slate-200 bg-white/80 p-10 text-center backdrop-blur-xl shadow-lg sm:p-16">
          {loading ? (
            // SKELETON LOADING STATE
            <div className="space-y-6">
              <Skeleton className="mx-auto h-28 w-48 rounded-xl bg-slate-200" />
              <Skeleton className="mx-auto h-1 w-24 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <Skeleton className="mx-auto h-8 w-48 bg-slate-200" />
                <Skeleton className="mx-auto h-4 w-64 bg-slate-200" />
                <Skeleton className="mx-auto h-4 w-56 bg-slate-200" />
              </div>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Skeleton className="h-10 w-32 rounded-xl bg-slate-200" />
                <Skeleton className="h-10 w-32 rounded-xl bg-slate-200" />
              </div>
              <Skeleton className="mx-auto h-4 w-40 bg-slate-200" />
            </div>
          ) : (
            // ACTUAL CONTENT
            <>
              {/* 404 Big Text */}
              <h1 className="mb-2 text-8xl font-extrabold tracking-tight sm:text-9xl">
                <span className="bg-linear-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                  404
                </span>
              </h1>

              {/* Decorative line */}
              <div className="mx-auto mb-6 h-0.5 w-24 rounded-full bg-linear-to-r from-purple-500 to-pink-500" />

              {/* Message */}
              <h2 className="mb-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Page not found
              </h2>
              <p className="mb-8 text-sm text-slate-600 sm:text-base">
                Oops! The page you're looking for doesn't exist or has been
                moved.
                <br className="hidden sm:inline" />
                Let's get you back on track.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <Button className="w-full sm:w-auto">
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </div>

              {/* Footer */}
              <p className="mt-10 text-xs text-slate-500">
                © 2026 ShopVerse. All rights reserved.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
