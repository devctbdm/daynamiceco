'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AccessDenied({
  title = 'Access denied',
  message = 'You are not allowed to access this page.',
}: {
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={() => router.push('/admin/dashboard')}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => router.push('/admin/dashboard')}>
            Back to dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
