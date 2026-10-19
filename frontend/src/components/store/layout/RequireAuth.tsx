'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/store';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, fetchUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
