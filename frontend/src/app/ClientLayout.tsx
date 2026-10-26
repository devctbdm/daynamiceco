// src/app/ClientLayout.tsx
'use client';

import { useAuth } from '@/store';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { fetchUser, user } = useAuth();

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user?.role !== 'customer') return;

    const socket = getSocket();
    const onNotification = (notification: {
      title: string;
      description: string;
    }) => {
      toast.info(notification.title, {
        description: notification.description,
      });
    };
    socket.on('notification:new', onNotification);

    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [user?.id, user?.role]);

  return (
    <div key={pathname} className="min-h-screen">
      {children}
    </div>
  );
}
