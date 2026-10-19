'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth, useCart } from '@/store';
import Link from 'next/link';
import { apiFetch } from '@/lib/http';

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    email: z.string().trim().email('Enter a valid email').max(255),
    telephone: z
      .string()
      .trim()
      .min(6, 'Enter a valid phone number')
      .max(20)
      .regex(/^[0-9+()\-\s]+$/, 'Only digits, spaces, and + ( ) - are allowed'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agree: z.boolean().refine((value) => value === true, {
      message: 'You must accept the Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
};

const initialValues: FormValues = {
  firstName: '',
  lastName: '',
  email: '',
  telephone: '',
  password: '',
  confirmPassword: '',
  agree: false,
};

function RegisterPage() {
  const router = useRouter();
  const { fetchUser, isAuthenticated, isLoading, user } = useAuth();
  const { syncCartWithBackend } = useCart();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user && !isAuthenticated) {
      fetchUser().catch(() => {});
    }
  }, [user, isAuthenticated, fetchUser]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(values);
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
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          name: `${parsed.data.firstName} ${parsed.data.lastName}`,
          email: parsed.data.email,
          password: parsed.data.password,
          phone: parsed.data.telephone,
        },
      });
      const data = res.data;

      if (!res.data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.token) {
        localStorage.setItem('mobile_token', data.token);
        document.cookie = `token=${data.token}; path=/; max-age=${3 * 60 * 60}; SameSite=Lax`;
      }

      await fetchUser().catch(() => {});
      await syncCartWithBackend().catch(() => {});

      toast.success('Account created! Welcome to Apple IT Zone.');
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-muted/30 px-4 py-10 ">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Apple IT Zone</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Fill in your details to create an Apple IT Zone account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={values.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    aria-invalid={!!errors.firstName}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={values.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    aria-invalid={!!errors.lastName}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) => update('email', e.target.value)}
                  aria-invalid={!!errors.email}
                  placeholder="example@gmail.com"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={values.password}
                    onChange={(e) => update('password', e.target.value)}
                    aria-invalid={!!errors.password}
                    placeholder="At least 6 characters"
                  />
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
                    type="password"
                    autoComplete="new-password"
                    value={values.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    aria-invalid={!!errors.confirmPassword}
                    placeholder="Repeat your password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+880 1234567890"
                  value={values.telephone}
                  onChange={(e) => update('telephone', e.target.value)}
                  aria-invalid={!!errors.telephone}
                  pattern="\+?[0-9\s\-\(\)]{9,13}"
                  title="Please enter a valid phone number (e.g., +880 1234567890 or 01234567890 or 1234567890)"
                />
                {errors.telephone && (
                  <p className="text-xs text-destructive">{errors.telephone}</p>
                )}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree"
                  checked={values.agree}
                  onCheckedChange={(v) => update('agree', v === true)}
                  aria-invalid={!!errors.agree}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="agree"
                    className="cursor-pointer text-sm font-normal"
                  >
                    I have read and agree to the{' '}
                    <a
                      href="/privacy"
                      className="text-primary underline underline-offset-4"
                    >
                      Privacy Policy
                    </a>
                  </Label>
                  {errors.agree && (
                    <p className="text-xs text-destructive">{errors.agree}</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 rounded-md border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Already have an account?</p>
              <p className="mt-1 text-muted-foreground">
                If you already have an account with us, please login at the
                <Link
                  href="/login"
                  className="text-primary underline underline-offset-4"
                >
                  login page
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPage;
