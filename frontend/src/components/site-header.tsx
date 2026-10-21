'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getAdminBreadcrumb } from '@/lib/adminNav';
import { cn } from '@/lib/utils';

export function SiteHeader({
  title,
  description,
}: {
  /**
   * Optional title for the current page. Falls back to the label derived from
   * the route (see `lib/adminNav.ts`).
   */
  title?: string;
  /** Optional longer description, surfaced as a tooltip on the current page. */
  description?: string;
} = {}) {
  const pathname = usePathname();
  const crumbs = getAdminBreadcrumb(pathname, title);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b py-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap gap-1.5 overflow-hidden">
            {crumbs.map((crumb, index) => {
              const isCurrent = index === crumbs.length - 1;

              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && (
                    <BreadcrumbSeparator className="hidden sm:block" />
                  )}
                  <BreadcrumbItem
                    // Only the current page fits on narrow screens.
                    className={cn(
                      'min-w-0',
                      !isCurrent && 'hidden sm:inline-flex'
                    )}
                  >
                    {isCurrent ? (
                      <BreadcrumbPage
                        className="truncate"
                        title={description?.trim() || undefined}
                      >
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink
                        render={<Link href={crumb.href} />}
                        className="truncate"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <span className="truncate">{crumb.label}</span>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
