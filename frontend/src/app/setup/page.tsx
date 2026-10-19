'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store';
import { apiFetch, ApiError } from '@/lib/http';

const setupSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(50),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .max(255)
      .email('Enter a valid email'),
    phone: z.string().trim().min(7, 'Enter a valid phone number'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const initialValues: FormValues = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

type Status = 'checking' | 'required' | 'done' | 'error';

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues | 'form', string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const checkStatus = useCallback(async () => {
    setStatus('checking');
    try {
      const res = await apiFetch<{ success: boolean; setupRequired: boolean }>(
        '/setup/status'
      );
      setStatus(res.data.setupRequired ? 'required' : 'done');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = setupSchema.safeParse(values);
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
    setErrors({});
    try {
      const res = await apiFetch('/setup', {
        method: 'POST',
        body: parsed.data,
      });
      const data = res.data;

      if (!data.success) {
        throw new Error(data.message || 'Setup failed');
      }

      // Sign the owner in immediately (same token handling as admin login).
      if (data.token) {
        localStorage.setItem('mobile_token', data.token);
        document.cookie = `token=${data.token}; path=/; max-age=${3 * 60 * 60}; SameSite=Lax`;
      }
      useAppStore.setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success('Super admin account created. Welcome!');
      router.push('/admin/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong';

      // 409 can mean "already set up" (someone beat us to it) or
      // "email taken" — re-check and show the right screen.
      if (err instanceof ApiError && err.status === 409) {
        const res = await apiFetch<{ setupRequired: boolean }>(
          '/setup/status'
        ).catch(() => null);
        if (res && !res.data.setupRequired) {
          setStatus('done');
          toast.info(message);
          return;
        }
        setErrors({ email: message });
        toast.error(message);
        return;
      }

      setErrors({ form: message });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Checking whether setup is still needed ----
  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={28} />
          <p className="text-sm">Checking setup status…</p>
        </div>
      </div>
    );
  }

  // ---- Backend unreachable ----
  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Can’t reach the server</CardTitle>
            <CardDescription>
              The API did not respond. Make sure the backend is running, then
              try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={checkStatus}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Apple IT Zone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            First-time setup — create the owner account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {status === 'done' ? 'Setup already completed' : 'Initial Setup'}
            </CardTitle>
            <CardDescription>
              {status === 'done'
                ? 'A super admin already exists, so this page is now locked.'
                : 'Create the first super admin account. This option disappears once the account exists.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'done' ? (
              <div className="space-y-4 text-center">
                <CheckCircle2
                  className="mx-auto text-green-600"
                  size={40}
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  The website owner has already been set up. Sign in to manage
                  your store.
                </p>
                <Link
                  href="/admin/login"
                  className={buttonVariants({ className: 'w-full' })}
                >
                  Go to admin login
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Website Owner"
                    value={values.name}
                    onChange={(e) => update('name', e.target.value)}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="owner@appleitzone.com"
                    value={values.email}
                    onChange={(e) => update('email', e.target.value)}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
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
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={values.password}
                      onChange={(e) => update('password', e.target.value)}
                      aria-invalid={!!errors.password}
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
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat the password"
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

                {errors.form && (
                  <p className="text-sm text-destructive">{errors.form}</p>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create super admin account'
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  This page works only once — after the first super admin is
                  created it can no longer be used.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
