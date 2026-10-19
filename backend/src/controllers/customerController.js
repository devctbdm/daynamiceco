import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import { customerOrders } from "../db/schema.js";
import { serializeUser, userEntries } from "../models/User.js";
import { findUserById } from "../users/users.repository.js";

export const getCustomers = async (req, res) => {
  try {
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const conditions = [eq(userEntries.role, "customer")];
    if (req.query.search) {
      const search = `%${String(req.query.search)
        .trim()
        .replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(
        or(
          ilike(userEntries.name, search),
          ilike(userEntries.email, search),
          ilike(userEntries.phone, search),
        ),
      );
    }
    if (req.query.status && req.query.status !== "all") {
      conditions.push(eq(userEntries.status, String(req.query.status)));
    }
    const where = and(...conditions);
    const database = getDatabase();
    const [[totalRow], rows] = await Promise.all([
      database.select({ total: count() }).from(userEntries).where(where),
      database
        .select()
        .from(userEntries)
        .where(where)
        .orderBy(desc(userEntries.createdAt))
        .offset((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);
    const orderStats = rows.length
      ? await database
          .select({
            userId: customerOrders.userId,
            orderCount: sql`count(*)::int`,
            totalSpent: sql`coalesce(sum(${customerOrders.totalAmount}), 0)::float8`,
          })
          .from(customerOrders)
          .where(
            inArray(
              customerOrders.userId,
              rows.map((row) => row.id),
            ),
          )
          .groupBy(customerOrders.userId)
      : [];
    const statsByUser = new Map(
      orderStats.map((entry) => [entry.userId, entry]),
    );
    const customers = rows.map((row) => {
      const user = serializeUser(row);
      const stats = statsByUser.get(user._id);
      return {
        ...user,
        orderCount: stats?.orderCount ?? 0,
        totalSpent: stats?.totalSpent ?? 0,
      };
    });
    const total = Number(totalRow?.total ?? 0);

    res.json({
      success: true,
      count: customers.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      customers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    const customerUser = user?.role === "customer" ? user : null;
    const [stats] = customerUser
      ? await getDatabase()
          .select({
            orderCount: sql`count(*)::int`,
            totalSpent: sql`coalesce(sum(${customerOrders.totalAmount}), 0)::float8`,
          })
          .from(customerOrders)
          .where(eq(customerOrders.userId, customerUser._id))
      : [];
    const customer = customerUser
      ? {
          ...customerUser,
          orderCount: stats?.orderCount ?? 0,
          totalSpent: stats?.totalSpent ?? 0,
        }
      : null;
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await findUserById(req.params.id);
    if (!customer || customer.role !== "customer") {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }
    if (String(req.user._id) === customer._id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }
    await getDatabase()
      .delete(userEntries)
      .where(eq(userEntries.id, customer._id));
    res.json({
      success: true,
      message: `Customer "${customer.name}" deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
