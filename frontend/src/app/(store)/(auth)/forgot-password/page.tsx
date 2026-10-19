'use client';

import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
import { apiFetch } from '@/lib/http';

const forgotSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(11, 'Enter a valid phone number')
    .max(15, 'Enter a valid phone number'),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forgotSchema.safeParse({ phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: {
          phone: parsed.data.phone,
        },
      });
      const data = res.data;
      if (!res.data.success) {
        throw new Error(data.message || 'Something went wrong');
      }
      toast.success('OTP sent to your phone');
      router.push(
        `/reset-password?phone=${encodeURIComponent(parsed.data.phone)}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Apple IT Zone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reset your password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot password</CardTitle>
            <CardDescription>
              Enter the phone number linked to your account. We&apos;ll text you
              a verification code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError(undefined);
                  }}
                  aria-invalid={!!error}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <Phone className="h-4 w-4 mr-2" />
                {submitting ? 'Sending code...' : 'Send verification code'}
              </Button>
            </form>

            <div className="mt-6 rounded-md border bg-muted/40 p-4 text-sm">
              <p className="text-muted-foreground">
                Remembered your password?{' '}
                <Link
                  href="/login"
                  className="text-primary underline underline-offset-4"
                >
                  Back to login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
