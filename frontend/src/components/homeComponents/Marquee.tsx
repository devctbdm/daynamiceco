'use client';

import { cn } from '@/lib/utils';
import React from 'react';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  reverse?: boolean;
  speed?: 'slow' | 'normal' | 'fast';
}

const durationMap = {
  slow: '40s',
  normal: '25s',
  fast: '15s',
};

export default function Marquee({
  children,
  className,
  pauseOnHover = true,
  reverse = false,
  speed = 'normal',
}: MarqueeProps) {
  return (
    <div className={cn('group relative flex overflow-hidden', className)}>
      <div
        className={cn(
          'flex min-w-full shrink-0 items-center gap-6 animate-marquee',
          reverse && 'animate-marquee-reverse',
          pauseOnHover && 'group-hover:paused'
        )}
        style={
          {
            '--duration': durationMap[speed],
          } as React.CSSProperties
        }
      >
        {children}
        {children}
      </div>

      <div
        aria-hidden
        className={cn(
          'flex min-w-full shrink-0 items-center gap-6 animate-marquee',
          reverse && 'animate-marquee-reverse',
          pauseOnHover && 'group-hover:paused'
        )}
        style={
          {
            '--duration': durationMap[speed],
          } as React.CSSProperties
        }
      >
        {children}
        {children}
      </div>
    </div>
  );
}
