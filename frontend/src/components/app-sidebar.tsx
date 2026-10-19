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
import { notificationApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/store';
import {
  BellCheck,
  ChartLine,
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

// This is sample data.
const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: <LayoutDashboard />,
    },
    {
      title: 'Home Cms',
      url: '#',
      icon: <LayoutArrowRight />,
      items: [
        {
          title: 'Slider',
          url: '/admin/slider',
        },

        {
          title: 'Home Slide Text',
          url: '/admin/homeslidertext',
        },
        {
          title: 'Service Finder',
          url: '/admin/service-finder',
        },
        {
          title: 'Physical Stores',
          url: '/admin/physical-stores',
        },
        {
          title: 'Home Text',
          url: '/admin/hometext',
        },
      ],
    },
    {
      title: 'Products',
      url: '#',
      icon: <ShoppingCart />,
      items: [
        {
          title: 'All Products',
          url: '/admin/products',
        },
        {
          title: 'New Product',
          url: '/admin/products/new',
        },
      ],
    },
    {
      title: 'Categories',
      url: '#',
      icon: <ListSortAscending />,
      items: [
        {
          title: 'All Categories',
          url: '/admin/categories',
        },
        {
          title: 'New Category',
          url: '/admin/categories/new',
        },
      ],
    },

    {
      title: 'Orders',
      url: '#',
      icon: <LayersArrowDown />,
      items: [
        {
          title: 'All Orders',
          url: '/admin/orders',
        },
        {
          title: 'New Order',
          url: '/admin/orders/new',
        },
      ],
    },
    {
      title: 'Filters Cms',
      url: '#',
      icon: <Layers />,
      items: [
        {
          title: 'All Filters',
          url: '/admin/filters',
        },
        {
          title: 'New Filter',
          url: '/admin/filters/new',
        },
      ],
    },
    {
      title: 'Promotionals',
      url: '#',
      icon: <Gem />,
      items: [
        {
          title: 'Coupons',
          url: '/admin/promo',
        },

        {
          title: 'All Offers',
          url: '/admin/offers',
        },
        {
          title: 'New Offer',
          url: '/admin/offers/new',
        },

        {
          title: 'Popup Offer',
          url: '/admin/popup',
        },
      ],
    },
    {
      title: 'Analytics',
      url: '#',
      icon: <ChartLine />,
      items: [
        {
          title: 'Overview',
          url: '/admin/analytics',
        },
        {
          title: 'Visitors',
          url: '/admin/visitors',
        },
        {
          title: 'admin history',
          url: '/admin/history',
        },
        {
          title: 'Health Check',
          url: '/admin/health',
        },
      ],
    },
    {
      title: 'Users',
      url: '#',
      icon: <UsersRound />,
      items: [
        {
          title: 'Customers',
          url: '/admin/customers',
        },
      ],
    },

    {
      title: 'Reviews',
      url: '#',
      icon: <UserStar />,
      items: [
        {
          title: 'Reviews',
          url: '/admin/reviews',
        },
        {
          title: 'Questions',
          url: '/admin/questions',
        },
      ],
    },
    {
      title: 'Notifications',
      url: '/admin/notifications',
      icon: <BellCheck />,
    },
    {
      title: 'Administrator',
      url: '#',
      icon: <ShieldAlert />,
      items: [
        {
          title: 'administrator',
          url: '/admin/administrator',
        },
      ],
    },
    {
      title: 'Settings',
      url: '#',
      icon: <Settings2Icon />,
      items: [
        {
          title: 'General',
          url: '/admin/settings',
        },
        {
          title: 'Payments',
          url: '/admin/payments',
        },

        {
          title: 'SMS',
          url: '/admin/sms',
        },
        {
          title: 'Meta Catalog',
          url: '/admin/meta',
        },
        {
          title: 'Maintenance',
          url: '/admin/maintenance',
        },
        {
          title: 'Admin History',
          url: '/admin/history',
          icon: <ShieldAlert />,
        },
      ],
    },
  ],
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
      notificationApi
        .unreadCount()
        .then((res) => {
          if (active) setUnread(res.data.unreadCount);
        })
        .catch(() => {});

    load();

    const socket = getSocket();
    const onNew = () => setUnread((u) => u + 1);
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
