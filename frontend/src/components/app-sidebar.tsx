'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';

import AppleLogo from '@/Apple.png';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useStoreLogo } from '@/hooks/useStoreLogo';
import { ADMIN_NAV } from '@/lib/adminNav';
import { notificationUnreadResource } from '@/lib/resources';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/store';
import {
  BellCheck,
  ChartLine,
  Coins,
  Gem,
  Layers,
  LayersArrowDown,
  LayoutArrowRight,
  LayoutDashboard,
  ListSortAscending,
  Settings2Icon,
  ShieldAlert,
  ShoppingCart,
  UsersRound,
  UserStar,
} from 'lucide-react';

// The route tree lives in lib/adminNav.ts (shared with the header breadcrumb);
// only the icons are declared here, keyed by group/page title.
const NAV_ICONS: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard />,
  'Home Cms': <LayoutArrowRight />,
  Products: <ShoppingCart />,
  Categories: <ListSortAscending />,
  Orders: <LayersArrowDown />,
  'Filters Cms': <Layers />,
  Promotionals: <Gem />,
  'Points Cms': <Coins />,
  Analytics: <ChartLine />,
  Users: <UsersRound />,
  Reviews: <UserStar />,
  Notifications: <BellCheck />,
  Administrator: <ShieldAlert />,
  Settings: <Settings2Icon />,
};

const data = {
  navMain: ADMIN_NAV.map((item) => ({
    ...item,
    icon: NAV_ICONS[item.title],
  })),
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const logo = useStoreLogo();
  const [unread, setUnread] = useState(0);

  // Sidebar brand mirrors the dynamic store logo (Settings → Logo): either the
  // uploaded logo image, or the icon + text + sub text combination.
  const teams = [
    {
      name: logo.logoText || logo.storeName || 'Apple IT Zone',
      logo:
        logo.logoType === 'image' && logo.logoUrl
          ? logo.logoUrl
          : logo.logoIconUrl || AppleLogo,
      plan: logo.logoSubText || 'IT Zone',
    },
  ];
  const sidebarUser = {
    name: user?.name || 'Guest',
    email: user?.email || 'Not signed in',
    avatar: '',
  };

  // Keep the notifications badge in sync with the live unread count.
  useEffect(() => {
    let active = true;
    const load = () =>
      // Shared resource: dedupes the repeated fetches caused by remounts;
      // explicit `force` keeps the non-badge read paths (e.g. the events
      // below) returning fresh data.
      notificationUnreadResource
        .get({ force: true })
        .then((unreadCount) => {
          if (active) setUnread(unreadCount);
        })
        .catch(() => {});

    // Warm the shared cache and hydrate the badge quickly.
    notificationUnreadResource
      .get()
      .then((unreadCount) => {
        if (active) setUnread(unreadCount);
      })
      .catch(() => {});

    const socket = getSocket();
    const onNew = () => {
      setUnread((u) => u + 1);
      // Drop the cached count so the next read refetches server truth.
      notificationUnreadResource.invalidate();
    };
    socket.on('notification:new', onNew);
    // The notifications page dispatches this when items are marked read.
    window.addEventListener('notifications-updated', load);

    return () => {
      active = false;
      socket.off('notification:new', onNew);
      window.removeEventListener('notifications-updated', load);
    };
  }, []);

  // Inject the live unread count into the Notifications nav item.
  const navMain = data.navMain.map((item) =>
    item.title === 'Notifications'
      ? { ...item, badge: unread > 0 ? unread : undefined }
      : item
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
