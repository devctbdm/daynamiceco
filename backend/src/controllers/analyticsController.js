import { findAllOrdersForReporting } from "../orders/orders.service.js";
import {
  countActiveProducts,
  findProductSummariesByIds,
} from "../products/products.repository.js";
import { countUsers } from "../users/users.repository.js";

export const getAnalytics = async (req, res) => {
  try {
    const allOrders = await findAllOrdersForReporting();
    const validOrders = allOrders.filter(
      (order) => order.orderStatus !== "cancelled",
    );
    const revenue = validOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );
    const productsSold = validOrders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const buyers = new Map();
    for (const order of validOrders) {
      const userId = String(order.user);
      buyers.set(userId, (buyers.get(userId) || 0) + 1);
    }
    const [products, customers] = await Promise.all([
      countActiveProducts(),
      countUsers({ role: "customer" }),
    ]);

    const orders = validOrders.length;
    const avgOrderValue = orders > 0 ? Math.round(revenue / orders) : 0;
    const avgItemsPerOrder =
      orders > 0 ? Number((productsSold / orders).toFixed(1)) : 0;
    const repeatBuyers = [...buyers.values()].filter(
      (count) => count >= 2,
    ).length;
    const repeatCustomerRate =
      customers > 0 ? Math.round((repeatBuyers / customers) * 100) : 0;

    const ordersByStatus = {
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const order of allOrders) {
      if (Object.hasOwn(ordersByStatus, order.orderStatus)) {
        ordersByStatus[order.orderStatus] += 1;
      }
    }

    const currentYear = new Date().getFullYear();
    const monthlyStats = new Map();
    const dailyStats = new Map();
    const startOf30 = new Date();
    startOf30.setDate(startOf30.getDate() - 29);
    startOf30.setHours(0, 0, 0, 0);
    for (const order of validOrders) {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === currentYear) {
        const key = `${currentYear}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        addAggregate(monthlyStats, key, order);
      }
      if (date >= startOf30) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        addAggregate(dailyStats, key, order);
      }
    }
    const monthly = Array.from({ length: 12 }, (_, month) => {
      const key = `${currentYear}-${String(month + 1).padStart(2, "0")}`;
      const aggregate = monthlyStats.get(key) || { revenue: 0, orders: 0 };
      return {
        month: new Date(Date.UTC(currentYear, month, 1)).toLocaleString(
          "en-US",
          {
            month: "short",
            timeZone: "UTC",
          },
        ),
        ...aggregate,
        avgOrderValue:
          aggregate.orders > 0
            ? Math.round(aggregate.revenue / aggregate.orders)
            : 0,
      };
    });

    const daily = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const aggregate = dailyStats.get(key) || { revenue: 0, orders: 0 };
      return {
        month: date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }),
        ...aggregate,
        avgOrderValue:
          aggregate.orders > 0
            ? Math.round(aggregate.revenue / aggregate.orders)
            : 0,
      };
    });

    const productsById = new Map();
    const unitsByCategory = new Map();
    for (const order of validOrders) {
      for (const item of order.items) {
        const id = String(item.product?._id ?? item.product);
        const product = productsById.get(id) || {
          _id: id,
          name: item.name,
          image: item.image,
          price: item.price,
          unitsSold: 0,
          revenue: 0,
        };
        const quantity = Number(item.quantity) || 0;
        const itemRevenue = (Number(item.price) || 0) * quantity;
        product.unitsSold += quantity;
        product.revenue += itemRevenue;
        productsById.set(id, product);
        const category = id;
        const categoryStats = unitsByCategory.get(category) || {
          revenue: 0,
          units: 0,
        };
        categoryStats.revenue += itemRevenue;
        categoryStats.units += quantity;
        unitsByCategory.set(category, categoryStats);
      }
    }

    const productDocs = await findProductSummariesByIds([
      ...productsById.keys(),
    ]);
    const productsInfo = new Map(
      productDocs.map((product) => [String(product._id), product]),
    );
    const topProducts = [...productsById.values()]
      .map((product) => ({
        ...product,
        sku: productsInfo.get(product._id)?.sku,
        productCode: productsInfo.get(product._id)?.productCode,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const categoriesByName = new Map();
    for (const [productId, aggregate] of unitsByCategory) {
      const name = productsInfo.get(productId)?.category || "Other";
      const key = String(name);
      const current = categoriesByName.get(key) || {
        revenue: 0,
        orders: 0,
      };
      current.revenue += aggregate.revenue;
      current.orders += aggregate.units;
      categoriesByName.set(key, current);
    }
    const categoriesRevenue = [...categoriesByName.values()].reduce(
      (sum, category) => sum + category.revenue,
      0,
    );
    const categories = [...categoriesByName.entries()]
      .map(([name, aggregate]) => ({
        name,
        ...aggregate,
        percentage:
          categoriesRevenue > 0
            ? Math.round((aggregate.revenue / categoriesRevenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: {
        stats: {
          revenue,
          orders,
          customers,
          products,
          productsSold,
          avgOrderValue,
          avgItemsPerOrder,
          repeatCustomerRate,
          ordersByStatus,
        },
        monthly,
        daily,
        topProducts,
        categories,
      },
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function addAggregate(aggregates, key, order) {
  const aggregate = aggregates.get(key) || { revenue: 0, orders: 0 };
  aggregate.revenue += Number(order.totalAmount) || 0;
  aggregate.orders += 1;
  aggregates.set(key, aggregate);
}
