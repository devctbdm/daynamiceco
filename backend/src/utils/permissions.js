/**
 * Central source-of-truth for application modules and the actions available
 * on each.  Both the middleware and the front-end permission-matrix UI rely on
 * these lists – keep them in sync if you rename or add modules.
 */

// ── All application modules ─────────────────────────────────────────────────
export const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "invoices", label: "Invoices" },
  { key: "reviews", label: "Reviews & Questions" },
  { key: "promotions", label: "Promotions & Promo Codes" },
  { key: "content", label: "Site Content" },
  { key: "analytics", label: "Analytics" },
  { key: "payments", label: "Payments & Settings" },
  { key: "staff", label: "Staff & Permissions" },
  { key: "settings", label: "Store Settings" },
  { key: "audit", label: "Audit Logs" },
];

// ── All possible actions on a module ────────────────────────────────────────
export const ACTIONS = ["view", "create", "edit", "delete", "manage", "export"];

// ── Default permissions per role ─────────────────────────────────────────────
// These are applied as fallbacks when a TeamMember has neither a permissionGroup
// nor customPermissions set.  super_admin always has full access (see middleware).
export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: () => buildFullPermissions(),

  admin: () =>
    buildPermissions({
      dashboard: { view: true },
      products: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
      categories: { view: true, create: true, edit: true, delete: true },
      orders: { view: true, edit: true, manage: true, export: true },
      customers: { view: true, edit: true, export: true },
      invoices: { view: true, export: true },
      reviews: { view: true, edit: true, delete: true },
      promotions: { view: true, create: true, edit: true, delete: true },
      content: { view: true, create: true, edit: true, delete: true },
      analytics: { view: true, export: true },
      payments: { view: true },
      staff: { view: true },
      settings: { view: true, edit: true },
      audit: { view: true },
    }),

  manager: () =>
    buildPermissions({
      dashboard: { view: true },
      products: { view: true, edit: true },
      orders: { view: true, edit: true, manage: true },
      customers: { view: true },
      invoices: { view: true },
      reviews: { view: true },
    }),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a full set of permissions (all modules × all actions = true).
 * Used for super_admin.
 */
function buildFullPermissions() {
  return MODULES.map((m) =>
    ACTIONS.reduce((acc, action) => ({ ...acc, [action]: true }), {
      module: m.key,
    }),
  );
}

/**
 * Build a permissions array from a sparse descriptor.
 *
 * @param {Record<string, Partial<Record<string,boolean>>>} descriptor
 *   Only the actions you want enabled; everything else defaults to false.
 * @returns {Array<{ module: string, view, create, edit, delete, manage, export }>}
 */
function buildPermissions(descriptor) {
  return MODULES.map((m) => {
    const granted = descriptor[m.key] || {};
    return ACTIONS.reduce(
      (acc, action) => ({ ...acc, [action]: Boolean(granted[action]) }),
      { module: m.key },
    );
  });
}

/**
 * Resolve the effective permissions for a staff member.
 *
 * Priority:
 *  1. customPermissions (if non-empty)
 *  2. permissionGroup.permissions (if populated)
 *  3. role-based defaults
 *
 * Always returns the full-access set for super_admin regardless of stored
 * values, so no one can accidentally lock out the top tier.
 *
 * @param {{ role: string, customPermissions?: Array, permissionGroup?: object }} member
 * @returns {Array}  Resolved permissions array
 */
export function resolvePermissions(
  member,
  permissionGroup = member.permissionGroup,
) {
  // super_admin always gets everything, no matter what's stored
  if (member.role === "super_admin") {
    return buildFullPermissions();
  }

  // Explicit custom permissions stored on the member
  if (member.customPermissions?.length) {
    return member.customPermissions;
  }

  // Permission group template
  if (permissionGroup?.permissions?.length) {
    return permissionGroup.permissions;
  }

  // Role-based default
  const fn = DEFAULT_ROLE_PERMISSIONS[member.role];
  return fn ? fn() : [];
}

/**
 * Check whether a resolved permissions array grants a specific action.
 *
 * @param {Array}  permissions  Output of resolvePermissions()
 * @param {string} module       Module key (e.g. 'orders')
 * @param {string} action       Action key (e.g. 'edit')
 * @returns {boolean}
 */
export function hasPermission(permissions, module, action) {
  const entry = permissions.find((p) => p.module === module);
  if (!entry) return false;
  // 'manage' grants everything within that module
  return Boolean(entry[action]) || Boolean(entry.manage);
}
