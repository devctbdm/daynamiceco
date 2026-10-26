'use client';

import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const RequireAuth = ({
  children,
  loadingFallback,
}: {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
}) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    if (loadingFallback) return loadingFallback;

    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
