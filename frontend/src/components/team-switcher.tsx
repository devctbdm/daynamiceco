'use client';

import { DropdownMenu } from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ChevronsUpDownIcon } from 'lucide-react';
import Image from 'next/image';

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo: any;
    plan: string;
  }[];
}) {
  const activeTeam = teams[0];
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
        >
          <div className="relative flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Image
              src={activeTeam.logo}
              alt="Logo"
              fill
              className="object-contain"
              sizes="32px"
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{activeTeam.name}</span>
            <span className="truncate text-xs">{activeTeam.plan}</span>
          </div>
          
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
