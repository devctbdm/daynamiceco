import { findAllOrdersForReporting } from "../orders/orders.service.js";
import { countUsers, findUsersByIds } from "../users/users.repository.js";
import {
  countActiveProducts,
  findProductSummariesByIds,
} from "../products/products.repository.js";

export const getDashboardStats = async (req, res) => {
  try {
    const allOrders = await findAllOrdersForReporting();
    const activeOrders = allOrders.filter(
      (order) => order.orderStatus !== "cancelled",
    );
    const revenue = activeOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );
    const productsSold = activeOrders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const [customers, products] = await Promise.all([
      countUsers({ role: "customer" }),
      countActiveProducts(),
    ]);

    const ordersByStatus = { pending: 0, processing: 0, cancelled: 0 };
    for (const order of allOrders) {
      if (Object.hasOwn(ordersByStatus, order.orderStatus)) {
        ordersByStatus[order.orderStatus] += 1;
      }
    }

    const recentRows = allOrders.slice(0, 5);
    const recentUsers = await findUsersByIds(
      recentRows.map((order) => order.user),
      { fields: ["name", "email", "phone"] },
    );
    const userById = new Map(
      recentUsers.map((user) => [String(user._id), user]),
    );
    const recentOrders = recentRows.map((order) => ({
      ...order,
      user: userById.get(String(order.user)) ?? order.user,
    }));

    const productSales = new Map();
    const categoryIds = new Set();
    for (const order of activeOrders) {
      for (const item of order.items) {
        const id = String(item.product?._id ?? item.product);
        const current = productSales.get(id) ?? {
          _id: id,
          name: item.name,
          image: item.image,
          sales: 0,
          revenue: 0,
        };
        current.sales += Number(item.quantity) || 0;
        current.revenue +=
          (Number(item.price) || 0) * (Number(item.quantity) || 0);
        productSales.set(id, current);
        categoryIds.add(id);
      }
    }
    const productsById = await findProductSummariesByIds([...categoryIds]);
    const categoryByProduct = new Map(
      productsById.map((product) => [String(product._id), product.category]),
    );
    const categoryRevenue = new Map();
    for (const [id, product] of productSales) {
      const category = categoryByProduct.get(id) || "Other";
      categoryRevenue.set(
        category,
        (categoryRevenue.get(category) || 0) + product.revenue,
      );
    }
    const totalCategoryRevenue = [...categoryRevenue.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const salesByCategory = [...categoryRevenue.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        value:
          totalCategoryRevenue > 0
            ? Math.round((value / totalCategoryRevenue) * 100)
            : 0,
      }));

    const topProducts = [...productSales.values()]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    const currentYear = new Date().getFullYear();
    const monthlyTotals = new Map();
    for (const order of activeOrders) {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        monthlyTotals.set(
          month,
          (monthlyTotals.get(month) || 0) + Number(order.totalAmount || 0),
        );
      }
    }
    const monthlyRevenue = Array.from({ length: 12 }, (_, month) => ({
      label: new Date(Date.UTC(currentYear, month, 1)).toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      value: monthlyTotals.get(month) || 0,
    }));

    res.json({
      success: true,
      stats: {
        revenue,
        orders: allOrders.length,
        customers,
        productsSold,
        products,
        ordersByStatus,
        recentOrders,
        topProducts,
        salesByCategory,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
