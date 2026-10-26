'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
import { useAuth } from '@/store';
import { TwoFactorStep } from '@/components/TwoFactorStep';
import type { LoginResponse } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import type { User } from '@/types/user';

const ADMIN_ROLES = ['super_admin', 'admin', 'manager'];

const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255)
    .email('Enter a valid email'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128),
});

type FormValues = { email: string; password: string };

const initialValues: FormValues = { email: '', password: '' };

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, fetchUser, setAuthenticatedUser } =
    useAuth();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Two-factor (SMS OTP) step state
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorExpiresIn, setTwoFactorExpiresIn] = useState<number>(0);
  const [twoFactorEmail, setTwoFactorEmail] = useState<string>('');

  useEffect(() => {
    if (!user && !isAuthenticated) {
      fetchUser().catch(() => {});
    }
  }, [user, isAuthenticated, fetchUser]);

  // Already signed in as staff -> straight to the dashboard
  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      ADMIN_ROLES.includes(user?.role || '')
    ) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = adminLoginSchema.safeParse(values);
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
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: {
          identifier: parsed.data.email,
          password: parsed.data.password,
          portal: 'admin',
        },
      });
      const data = res.data;

      if (!res.data.success) {
        throw new Error(data.message || 'Login failed');
      }

      const loginData = data as LoginResponse;

      // Two-factor challenge: the 2FA response has no `user`, so handle it
      // before the admin role gate below.
      if (loginData.twoFactorRequired && loginData.pendingToken) {
        setPendingToken(loginData.pendingToken);
        setTwoFactorExpiresIn(loginData.expiresIn || 0);
        setTwoFactorEmail(parsed.data.email);
        toast.success('A verification code was sent to your phone.');
        return;
      }

      const role = data.user?.role;

      if (!ADMIN_ROLES.includes(role || '')) {
        await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
        setErrors({
          email:
            'This is the staff login. Only staff accounts can sign in here.',
        });
        return;
      }

      if (data.token) {
        localStorage.setItem('mobile_token', data.token);
        document.cookie = `token=${data.token}; path=/; max-age=${3 * 60 * 60}; SameSite=Lax`;
      }

      setAuthenticatedUser(data.user as User);

      toast.success(`Welcome back, ${data.user?.name || 'Admin'}!`);
      router.replace('/admin/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTwoFactorSuccess = (token: string, user: User) => {
    if (token) {
      localStorage.setItem('mobile_token', token);
      document.cookie = `token=${token}; path=/; max-age=${3 * 60 * 60}; SameSite=Lax`;
    }
    setAuthenticatedUser(user);
    toast.success(`Welcome back, ${user?.name || 'Admin'}!`);
    router.replace('/admin/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Apple IT Zone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin panel — staff access only
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {pendingToken ? 'Verify it’s you' : 'Admin Login'}
            </CardTitle>
            <CardDescription>
              {pendingToken
                ? 'Enter the code we sent to your phone to finish signing in.'
                : 'Sign in with your staff email and password to manage the store.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingToken ? (
              <TwoFactorStep
                pendingToken={pendingToken}
                expiresIn={twoFactorExpiresIn}
                onSuccess={handleTwoFactorSuccess}
                onBack={() => {
                  setPendingToken(null);
                  setTwoFactorEmail('');
                }}
              />
            ) : (
              <>
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="admin@appleitzone.com"
                      value={values.email}
                      onChange={(e) => update('email', e.target.value)}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-primary underline underline-offset-4"
                      >
                        Forgotten Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
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
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? 'Signing in...' : 'Sign in to admin panel'}
                  </Button>
                </form>

                <div className="mt-6 rounded-md border bg-muted/40 p-4 text-sm">
                  <p className="text-muted-foreground">
                    Customers should{' '}
                    <Link
                      href="/login"
                      className="text-primary underline underline-offset-4"
                    >
                      sign in here
                    </Link>
                    .
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
