export type AdminRole = 'super_admin' | 'admin' | 'manager';

// Minimum role required to view a given admin route.
//  - 'super_admin' : only super admin
//  - 'admin'       : admin or super admin
//  - 'any'         : any signed-in admin/manager (already gated by the admin layout)
//  - 'nobody'      : blocked for everyone (e.g. a page under construction)
// Routes not listed default to 'any'.
export type RouteAccess = AdminRole | 'any' | 'nobody';

export const ADMIN_ROUTE_ACCESS: Record<string, RouteAccess> = {
  '/admin/users': 'super_admin',
  '/admin/team': 'super_admin',
  '/admin/administrator': 'super_admin',
  '/admin/payments': 'super_admin',
  '/admin/sms': 'super_admin',
  '/admin/meta': 'super_admin',
  '/admin/promo': 'super_admin',
  '/admin/settings': 'admin',
  '/admin/maintenance': 'super_admin',
  '/admin/history': 'super_admin',
  // '/admin/billing': 'nobody', // example: under construction -> blocked for all
};

// Optional custom "access denied" message shown for a specific route.
export const ADMIN_ROUTE_DENIED_MESSAGE: Record<string, string> = {
  '/admin/sms': 'This tab is for super admin only.',
};

const ROLE_RANK: Record<AdminRole, number> = {
  manager: 1,
  admin: 2,
  super_admin: 3,
};

export function canAccessRoute(pathname: string, role?: string): boolean {
  const required = ADMIN_ROUTE_ACCESS[pathname];
  if (!required) return true;
  if (required === 'nobody') return false;
  if (required === 'any') return true;
  if (!role) return false;
  return (ROLE_RANK[role as AdminRole] ?? 0) >= ROLE_RANK[required];
}
