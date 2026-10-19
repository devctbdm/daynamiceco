// ─── Shared constants for the Staff & Access Management UI ───────────────────

export type StaffRole = 'super_admin' | 'admin' | 'manager';

export const ROLES: { value: StaffRole; label: string; hint: string; color: string }[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    hint: 'Full access to all modules including staff and permissions management',
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  },
  {
    value: 'admin',
    label: 'Admin',
    hint: 'Manage catalog, orders, customers, content and analytics',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'manager',
    label: 'Manager',
    hint: 'Manage orders and inventory only',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.value, r]));

export const MODULES = [
  { key: 'dashboard',  label: 'Dashboard' },
  { key: 'products',   label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'orders',     label: 'Orders' },
  { key: 'customers',  label: 'Customers' },
  { key: 'invoices',   label: 'Invoices' },
  { key: 'reviews',    label: 'Reviews & Questions' },
  { key: 'promotions', label: 'Promotions & Promo Codes' },
  { key: 'content',    label: 'Site Content' },
  { key: 'analytics',  label: 'Analytics' },
  { key: 'payments',   label: 'Payments & Settings' },
  { key: 'staff',      label: 'Staff & Permissions' },
  { key: 'settings',   label: 'Store Settings' },
  { key: 'audit',      label: 'Audit Logs' },
] as const;

export const ACTIONS = [
  { key: 'view',   label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit',   label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'manage', label: 'Manage' },
  { key: 'export', label: 'Export' },
] as const;

export type ModuleKey = (typeof MODULES)[number]['key'];
export type ActionKey = (typeof ACTIONS)[number]['key'];

/** Build an all-false permission row for a module */
export function emptyModulePermission(moduleKey: string) {
  return {
    module: moduleKey,
    view: false,
    create: false,
    edit: false,
    delete: false,
    manage: false,
    export: false,
  };
}

/** Build the full default permission array with all false */
export function buildEmptyPermissions() {
  return MODULES.map((m) => emptyModulePermission(m.key));
}

export const EVENT_LABELS: Record<string, string> = {
  STAFF_CREATED: 'Staff created',
  STAFF_UPDATED: 'Staff updated',
  STAFF_DELETED: 'Staff deleted',
  STAFF_STATUS_CHANGED: 'Status changed',
  STAFF_ROLE_CHANGED: 'Role changed',
  STAFF_PERMISSIONS_UPDATED: 'Permissions updated',
  PERMISSION_GROUP_CREATED: 'Group created',
  PERMISSION_GROUP_UPDATED: 'Group updated',
  PERMISSION_GROUP_DELETED: 'Group deleted',
  LOGIN: 'Login',
};

export const EVENT_COLORS: Record<string, string> = {
  STAFF_CREATED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  STAFF_UPDATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  STAFF_DELETED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  STAFF_STATUS_CHANGED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  STAFF_ROLE_CHANGED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  STAFF_PERMISSIONS_UPDATED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  PERMISSION_GROUP_CREATED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  PERMISSION_GROUP_UPDATED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  PERMISSION_GROUP_DELETED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};
