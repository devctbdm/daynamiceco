/**
 * Single source of truth for the admin navigation tree.
 *
 * `components/app-sidebar.tsx` renders this tree (attaching the icons) and
 * `components/site-header.tsx` derives the breadcrumb labels from it, so the
 * two stay in sync without duplicating route titles.
 */
export type AdminNavSubItem = {
  title: string;
  url: string;
};

export type AdminNavItem = {
  title: string;
  url: string;
  items?: AdminNavSubItem[];
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
  },
  {
    title: 'Home Cms',
    url: '#',
    items: [
      { title: 'Slider', url: '/admin/slider' },
      { title: 'Home Slide Text', url: '/admin/homeslidertext' },
      { title: 'Service Finder', url: '/admin/service-finder' },
      { title: 'Physical Stores', url: '/admin/physical-stores' },
      { title: 'Home Text', url: '/admin/hometext' },
    ],
  },
  {
    title: 'Products',
    url: '#',
    items: [
      { title: 'All Products', url: '/admin/products' },
      { title: 'New Product', url: '/admin/products/new' },
    ],
  },
  {
    title: 'Categories',
    url: '#',
    items: [
      { title: 'All Categories', url: '/admin/categories' },
      { title: 'New Category', url: '/admin/categories/new' },
    ],
  },
  {
    title: 'Orders',
    url: '#',
    items: [
      { title: 'All Orders', url: '/admin/orders' },
      { title: 'New Order', url: '/admin/orders/new' },
    ],
  },
  {
    title: 'Filters Cms',
    url: '#',
    items: [
      { title: 'All Filters', url: '/admin/filters' },
      { title: 'New Filter', url: '/admin/filters/new' },
    ],
  },
  {
    title: 'Promotionals',
    url: '#',
    items: [
      { title: 'Coupons', url: '/admin/promo' },
      { title: 'All Offers', url: '/admin/offers' },
      { title: 'New Offer', url: '/admin/offers/new' },
      { title: 'Popup Offer', url: '/admin/popup' },
    ],
  },
  {
    title: 'Analytics',
    url: '#',
    items: [
      { title: 'Overview', url: '/admin/analytics' },
      { title: 'Visitors', url: '/admin/visitors' },
      { title: 'admin history', url: '/admin/history' },
      { title: 'Health Check', url: '/admin/health' },
    ],
  },
  {
    title: 'Users',
    url: '#',
    items: [{ title: 'Customers', url: '/admin/customers' }],
  },
  {
    title: 'Reviews',
    url: '#',
    items: [
      { title: 'Reviews', url: '/admin/reviews' },
      { title: 'Questions', url: '/admin/questions' },
    ],
  },
  {
    title: 'Notifications',
    url: '/admin/notifications',
  },
  {
    title: 'Administrator',
    url: '#',
    items: [{ title: 'administrator', url: '/admin/administrator' }],
  },
  {
    title: 'Settings',
    url: '#',
    items: [
      { title: 'General', url: '/admin/settings' },
      { title: 'Payments', url: '/admin/payments' },
      { title: 'SMS', url: '/admin/sms' },
      { title: 'Meta Catalog', url: '/admin/meta' },
      { title: 'Maintenance', url: '/admin/maintenance' },
      { title: 'Admin History', url: '/admin/history' },
    ],
  },
];

export const ADMIN_DASHBOARD_URL = '/admin/dashboard';

export type AdminCrumb = {
  label: string;
  /** Present for every crumb except the current page. */
  href?: string;
};

type NavEntry = {
  url: string;
  label: string;
  /** Parent group title, when the entry lives inside a collapsible group. */
  group?: string;
};

/** Flat lookup list, in navigation order (first match wins for duplicate urls). */
const NAV_ENTRIES: NavEntry[] = ADMIN_NAV.flatMap((item) =>
  item.items?.length
    ? item.items.map((sub) => ({
        url: sub.url,
        label: sub.title,
        group: item.title,
      }))
    : item.url !== '#'
      ? [{ url: item.url, label: item.title }]
      : []
);

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const ACRONYMS = new Set([
  'sms',
  'cms',
  'id',
  'api',
  'faq',
  'seo',
  'ui',
  'sku',
  'otp',
]);

/**
 * Navigation titles are written by hand (some are lowercase on purpose), so
 * only titles that are fully lowercase get title-cased for display.
 */
function displayLabel(title: string): string {
  if (title !== title.toLowerCase()) return title;
  return title.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Human-friendly label for a raw URL segment. */
function prettifySegment(segment: string): string {
  if (OBJECT_ID.test(segment)) return `#${segment.slice(0, 7).toUpperCase()}`;
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

/**
 * Breadcrumb trail for an admin path, derived from {@link ADMIN_NAV}:
 *
 *   /admin/slider          → Dashboard / Home Cms / Slider
 *   /admin/products/new    → Dashboard / Products / New Product
 *   /admin/offers/edit/123 → Dashboard / Promotionals / All Offers / Edit / #68F2A1C
 *   /admin/team            → Dashboard / Team   (route outside the nav tree)
 *
 * `overrideLabel` replaces the last crumb, letting a page pass a nicer title
 * than the one the route suggests.
 */
export function getAdminBreadcrumb(
  pathname: string,
  overrideLabel?: string
): AdminCrumb[] {
  const clean = (pathname || '/')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '');

  const crumbs: AdminCrumb[] = [];

  // Avoid repeating the same label twice in a row (e.g. Reviews / Reviews, or
  // the Administrator group holding an "administrator" page).
  const push = (crumb: AdminCrumb) => {
    const previous = crumbs[crumbs.length - 1];
    if (previous && previous.label.toLowerCase() === crumb.label.toLowerCase())
      return;
    crumbs.push(crumb);
  };

  if (!clean || clean === '/admin' || clean === ADMIN_DASHBOARD_URL) {
    push({ label: 'Dashboard' });
  } else {
    const exact = NAV_ENTRIES.find((entry) => entry.url === clean);
    const parent =
      exact ??
      NAV_ENTRIES.filter((entry) => clean.startsWith(`${entry.url}/`)).sort(
        (a, b) => b.url.length - a.url.length
      )[0];

    push({ label: 'Dashboard', href: ADMIN_DASHBOARD_URL });

    if (!parent) {
      // Route that is not part of the navigation tree: build a trail from the
      // raw path so admins still get their bearings.
      const segments = clean.replace(/^\/+/, '').split('/').filter(Boolean);
      if (segments[0] === 'admin') segments.shift();
      segments.forEach((segment) => push({ label: prettifySegment(segment) }));
    } else {
      if (parent.group) push({ label: displayLabel(parent.group) });

      const rest = clean.slice(parent.url.length).split('/').filter(Boolean);

      push({
        label: displayLabel(parent.label),
        href: rest.length ? parent.url : undefined,
      });

      rest.forEach((segment) => push({ label: prettifySegment(segment) }));
    }
  }

  const label = overrideLabel?.trim();
  if (label) {
    crumbs[crumbs.length - 1] = { label };
  }

  return crumbs;
}
