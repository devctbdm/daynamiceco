'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';

type Props = {
  pendingToken: string;
  expiresIn: number;
  onSuccess: (token: string, user: any) => void;
  onBack: () => void;
};

export function TwoFactorStep({ pendingToken, expiresIn, onSuccess, onBack }: Props) {
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(expiresIn);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length < 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await authApi.verifyOtp({ pendingToken, otp: otp.trim() });
      if (data.success && data.token) {
        toast.success('Verified');
        onSuccess(data.token, data.user);
      } else {
        toast.error(data.message || 'Invalid code');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Two-Factor Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code we sent to your phone to continue.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="text-center text-lg tracking-[0.5em]"
            aria-invalid={false}
          />
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Code expires in {remaining}s
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
            </>
          ) : (
            'Verify & continue'
          )}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </button>
      </form>
    </div>
  );
}
