'use client';

import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const resetSchema = z
  .object({
    phone: z.string().trim().min(11, 'Enter a valid phone number').max(15),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = {
  phone: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<FormValues>({
    phone: searchParams.get('phone') || '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: {
          phone: parsed.data.phone,
          otp: parsed.data.otp,
          newPassword: parsed.data.newPassword,
        },
      });
      const data = res.data;
      if (!res.data.success) {
        throw new Error(data.message || 'Something went wrong');
      }
      toast.success('Password reset successfully');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!values.phone.trim()) {
      toast.error('Enter your phone number first');
      return;
    }
    setResending(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: {
          phone: values.phone,
        },
      });
      const data = res.data;
      if (!res.data.success) {
        throw new Error(data.message || 'Something went wrong');
      }
      toast.success('New code sent to your phone');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Apple IT Zone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set a new password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Enter the code we texted you and choose a new password.
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
                  value={values.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  maxLength={6}
                  value={values.otp}
                  onChange={(e) =>
                    update('otp', e.target.value.replace(/\D/g, ''))
                  }
                  aria-invalid={!!errors.otp}
                />
                {errors.otp && (
                  <p className="text-xs text-destructive">{errors.otp}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={values.newPassword}
                    onChange={(e) => update('newPassword', e.target.value)}
                    aria-invalid={!!errors.newPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {errors.newPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={values.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <KeyRound className="h-4 w-4 mr-2" />
                {submitting ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-sm">
              <button
                type="button"
                onClick={onResend}
                disabled={resending}
                className="text-primary underline underline-offset-4 hover:opacity-80"
              >
                {resending
                  ? 'Sending new code...'
                  : "Didn't receive the code? Resend"}
              </button>
              <p className="text-muted-foreground">
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
