'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
import { useAppStore, useAuth, useCart } from '@/store';
import Link from 'next/link';
import { TwoFactorStep } from '@/components/TwoFactorStep';
import type { LoginResponse } from '@/lib/api';
import { apiFetch } from '@/lib/http';

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or phone is required').max(255),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128),
});

type FormValues = {
  identifier: string;
  password: string;
};

function getPostLoginPath(role?: string) {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (
    redirect?.startsWith('/') &&
    !redirect.startsWith('//') &&
    !redirect.includes('\\')
  ) {
    return redirect;
  }
  return role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/';
}

const initialValues: FormValues = {
  identifier: '',
  password: '',
};

export default function LoginPage() {
  const router = useRouter();
  const { fetchUser, isAuthenticated, isLoading, user } = useAuth();
  const { syncCartWithBackend } = useCart();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Two-factor (SMS OTP) step state
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorExpiresIn, setTwoFactorExpiresIn] = useState<number>(0);

  useEffect(() => {
    if (!user && !isAuthenticated) {
      fetchUser().catch(() => {});
    }
  }, [user, isAuthenticated, fetchUser]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getPostLoginPath(user?.role));
    }
  }, [isLoading, isAuthenticated, user, router]);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(values);
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
        body: parsed.data,
      });
      const data = res.data;

      if (!res.data.success) {
        throw new Error(data.message || 'Login failed');
      }

      const loginData = data as LoginResponse;
      if (loginData.twoFactorRequired && loginData.pendingToken) {
        setPendingToken(loginData.pendingToken);
        setTwoFactorExpiresIn(loginData.expiresIn || 0);
        toast.success('A verification code was sent to your phone.');
        return;
      }

      if (data.token) {
        localStorage.setItem('mobile_token', data.token);
        document.cookie = `token=${data.token}; path=/; max-age=${3 * 60 * 60}; SameSite=Lax`;
      }

      await fetchUser().catch(() => {});

      // Fallback: if /auth/me failed, still populate the store from the login response
      if (!useAppStore.getState().user && data.user) {
        useAppStore.setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }

      await syncCartWithBackend().catch(() => {});

      const role = data.user?.role || useAppStore.getState().user?.role;
      toast.success(`Welcome back, ${data.user?.name || 'User'}!`);
      router.push(getPostLoginPath(role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTwoFactorSuccess = async (token: string, user: any) => {
    if (token) {
      localStorage.setItem('mobile_token', token);
      document.cookie = `token=${token}; path=/; max-age=${3 * 60 * 60}; SameSite=Lax`;
    }
    useAppStore.setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    await fetchUser().catch(() => {});
    await syncCartWithBackend().catch(() => {});
    const role = user?.role || useAppStore.getState().user?.role;
    toast.success(`Welcome back, ${user?.name || 'User'}!`);
    router.push(getPostLoginPath(role));
  };

  return (
    <div className="bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Apple IT Zone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{pendingToken ? 'Verify it’s you' : 'Login'}</CardTitle>
            <CardDescription>
              {pendingToken
                ? 'Enter the code we sent to your phone to finish signing in.'
                : 'Enter your email or phone and password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingToken ? (
              <TwoFactorStep
                pendingToken={pendingToken}
                expiresIn={twoFactorExpiresIn}
                onSuccess={handleTwoFactorSuccess}
                onBack={() => setPendingToken(null)}
              />
            ) : (
              <>
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Phone / E-Mail</Label>
                    <Input
                      id="identifier"
                      type="text"
                      autoComplete="username"
                      placeholder="Enter your phone or email"
                      value={values.identifier}
                      onChange={(e) => update('identifier', e.target.value)}
                      aria-invalid={!!errors.identifier}
                    />
                    {errors.identifier && (
                      <p className="text-xs text-destructive">
                        {errors.identifier}
                      </p>
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
                    {submitting ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>

                <div className="mt-6 rounded-md border bg-muted/40 p-4 text-sm">
                  <p className="font-medium">Don&apos;t have an account?</p>
                  <p className="mt-1 text-muted-foreground">
                    <Link
                      href="/register"
                      className="text-primary underline underline-offset-4"
                    >
                      Create Your Account
                    </Link>{' '}
                    to get started.
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
