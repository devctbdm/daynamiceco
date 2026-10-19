'use client';
import { Construction, Clock, Hammer, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMaintenance } from "@/hooks/use-maintenance";

function formatDuration(ms: number) {
  if (ms <= 0) return "Back online now";

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (seconds > 0 || parts.length === 0)
    parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);

  return parts.join(", ");
}

export default function MaintenancePage() {
  const { enabled, status } = useMaintenance(10000);
  const endTime = status?.endAt ? new Date(status.endAt).getTime() : null;
  const [remaining, setRemaining] = useState<number | null>(
    endTime !== null ? endTime - Date.now() : null
  );

  useEffect(() => {
    if (endTime === null) return;
    const timer = setInterval(() => {
      setRemaining(endTime - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const message =
    status?.message?.trim() ||
    "We're working hard to improve Apple IT Zone and give you a better experience. We'll be back online shortly.";

  const email = status?.contactEmail || "support@appleitzone.com";
  const phone = status?.contactPhone || "+880 1234 567890";

  if (!enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <Wrench size={28} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">We&apos;re back online</h1>
            <p className="mt-3 text-muted-foreground">
              Maintenance has ended. Everything is up and running again.
            </p>
            <Link href="/" className={cn(buttonVariants(), "mt-8")}>
              Back to store
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-accent blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-muted-foreground/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <Card className="border border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:px-12 sm:py-16">
            {/* Icon cluster */}
            <div className="relative mb-8">
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Construction size={56} strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg">
                <Hammer size={20} />
              </div>
              <div className="absolute -left-2 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
                <Wrench size={18} />
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Under Maintenance
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
              {message}
            </p>

            {/* Countdown timer */}
            {endTime !== null && (
              <div className="mt-8 inline-flex flex-col items-center gap-2 rounded-2xl border bg-muted px-6 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock size={16} />
                  Expected back in
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {formatDuration(remaining ?? 0)}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="my-8 h-px w-full max-w-xs bg-border" />

            {/* Contact info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Need urgent help? Contact us at{" "}
                <a
                  href={`mailto:${email}`}
                  className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {email}
                </a>
              </p>
              <p>
                Call:{" "}
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {phone}
                </a>
              </p>
              <p className="pt-3">
                <Link
                  href="/admin/login"
                  className="text-xs text-muted-foreground/70 underline-offset-2 hover:text-primary hover:underline"
                >
                  Admin login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Apple IT Zone. All rights reserved.
        </p>
      </div>
    </div>
  );
}
