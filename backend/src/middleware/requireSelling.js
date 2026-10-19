import { getMaintenanceSetting } from "../maintenance/maintenance.service.js";

// Staff can still place orders on a customer's behalf while the store is
// browse-only (e.g. phone/POS orders).
const STAFF_ROLES = ["super_admin", "admin", "manager"];

/**
 * Block customer purchases while the store is in browse-only ("stop selling")
 * mode. Customers may keep browsing products, but cart-adds, order creation and
 * payment initiation are rejected with a 403.
 *
 * @route applier: router.post('/', protect, requireSelling, handler)
 */
export const requireSelling = async (req, res, next) => {
  try {
    const setting = await getMaintenanceSetting();

    if (setting.sellingEnabled !== false) return next();
    if (STAFF_ROLES.includes(req.user?.role)) return next();

    return res.status(403).json({
      success: false,
      code: "SELLING_DISABLED",
      message:
        setting.sellingMessage?.trim() ||
        "Purchasing is temporarily disabled. You can browse products, but orders cannot be placed right now.",
    });
  } catch {
    // Fail open: a settings lookup error must not block legitimate sales.
    next();
  }
};

export default requireSelling;
