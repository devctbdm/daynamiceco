import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { getDatabase } from "../db/database.js";
import { customerOrders } from "../db/schema.js";
import {
  changeProductStock,
  changeProductVariantStock,
  assertProductPurchaseStock,
  findProductById,
  resolveProductPurchase,
} from "../products/products.repository.js";
import {
  computePromoItemDiscount,
  promoCodeEntries,
} from "../models/PromoCode.js";
import { expandPromoCategories } from "../utils/categoryTree.js";
import {
  findUserById,
  findUsersByIds,
  searchUsers,
} from "../users/users.repository.js";
import { getNextOrderNumber } from "../utils/orderNumber.js";
import {
  notifyOrderConfirmation,
  notifyOrderStatusEmail,
} from "../services/emailService.js";
import { notifyOrderStatusChange } from "../services/smsService.js";
import {
  createCustomerNotification,
  createNotification,
} from "../services/notificationService.js";
import {
  estimateEarnedPoints,
  getEligibleSubtotal,
  LoyaltyService,
} from "../loyalty/loyalty.service.js";

const ORDER_STATUSES = [
  "pending",
  "processing",
  "confirmed",
  "send_courier",
  "delivered",
  "cancelled",
];
const PAYMENT_METHODS = [
  "cod",
  "bkash",
  "nagad",
  "sslcommerz",
  "bank_transfer",
  "cash",
];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled"];

class OrdersService {
  constructor(database, loyaltyService) {
    this.database = database;
    this.loyaltyService = loyaltyService;
  }

  async create(user, input) {
    validateShippingAddress(input?.shippingAddress);
    const prepared = await this.prepareItems(input?.items, false);
    let coupon;
    let order;
    let totalAmount;
    try {
      coupon = await this.applyCoupon(input?.couponCode, prepared);
      const deliveryMethod = input?.deliveryMethod || "standard";
      if (!["standard", "express"].includes(deliveryMethod)) {
        throw new BadRequestException({
          success: false,
          message: "Invalid delivery method",
        });
      }
      const shippingFee =
        coupon.promo?.type === "free_shipping"
          ? 0
          : deliveryMethod === "express"
            ? 100
            : 0;
      const orderId = randomBytes(12).toString("hex");
      const settings = await this.loyaltyService.getSettings();
      const earningItems = applyCouponToLoyaltyItems(
        prepared.loyaltyItems,
        prepared.subtotal,
        coupon.discount,
      );
      const eligibleSubtotal = getEligibleSubtotal(earningItems, settings);
      const pointsEstimated = settings.enabled
        ? estimateEarnedPoints(earningItems, settings)
        : 0;
      order = await this.database.transaction(async (tx) => {
        const redemption = await this.loyaltyService.createRedemption(tx, {
          customerId: String(user._id ?? user.id),
          orderId,
          points: input?.redeemPoints ?? 0,
          eligibleSubtotal,
          settings,
        });
        totalAmount = Math.max(
          0,
          prepared.subtotal -
            coupon.discount -
            redemption.discount +
            shippingFee,
        );
        return this.insertOrder(
          {
            userId: String(user._id ?? user.id),
            items: prepared.items,
            shippingAddress: input.shippingAddress,
            totalAmount,
            shippingFee,
            coupon: { code: coupon.code, discount: coupon.discount },
            loyalty: {
              pointsRedeemed: redemption.points,
              discount: redemption.discount,
              pointsEstimated,
              pointsEarned: 0,
              eligibleSubtotal,
              refundedAmount: 0,
            },
            payment: {
              method: input?.paymentMethod || "sslcommerz",
              status: "pending",
            },
            orderStatus: "pending",
            note: String(input?.note || "")
              .trim()
              .slice(0, 500),
            orderNumber: await getNextOrderNumber(),
          },
          tx,
          orderId,
        );
      });
    } catch (error) {
      await this.restoreStock(prepared.deducted);
      throw error;
    }
    await this.recordCouponUse(coupon.promo);

    this.notifyPlaced(order, user);
    await createNotification({
      category: "order",
      title: "New order received",
      description: `Order ${order.orderNumber} placed by ${user.name || "a customer"} for ৳${totalAmount}.`,
      link: `/admin/orders?id=${order._id}`,
      order: order._id,
    });
    await createCustomerNotification({
      userId: String(user._id ?? user.id),
      category: "order",
      title: `Order ${order.orderNumber} received`,
      description: `We received your order. Its current status is ${formatOrderStatus(order.orderStatus)}.`,
      order: order._id,
    });
    return order;
  }

  async createForCustomer(actor, input) {
    if (!input?.customerId) {
      throw new BadRequestException({
        success: false,
        message: "Customer is required",
      });
    }
    const customer = await findUserById(input.customerId, {
      database: this.database,
    });
    if (!customer || customer.role !== "customer") {
      throw new NotFoundException({
        success: false,
        message: "Customer not found",
      });
    }

    const address = input.shippingAddress ?? {};
    const method = input.paymentMethod || "cod";
    const orderStatus = input.orderStatus || "pending";
    const paymentStatus = String(
      input.paymentStatus || "pending",
    ).toLowerCase();
    if (!PAYMENT_METHODS.includes(method)) {
      throw new BadRequestException({
        success: false,
        message: `Invalid payment method: ${method}`,
      });
    }
    if (!ORDER_STATUSES.includes(orderStatus)) {
      throw new BadRequestException({
        success: false,
        message: `Invalid order status: ${orderStatus}`,
      });
    }
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      throw new BadRequestException({
        success: false,
        message: `Invalid payment status: ${paymentStatus}`,
      });
    }

    validateShippingAddress(address);
    const prepared = await this.prepareItems(input.items, true);
    let coupon;
    const shippingFee = Math.max(0, Number(input.shippingFee) || 0);
    let order;
    let totalAmount;
    try {
      coupon = await this.applyCoupon(input.couponCode, prepared);
      totalAmount = Math.max(
        0,
        prepared.subtotal - coupon.discount + shippingFee,
      );
      const settings = await this.loyaltyService.getSettings();
      const earningItems = applyCouponToLoyaltyItems(
        prepared.loyaltyItems,
        prepared.subtotal,
        coupon.discount,
      );
      const eligibleSubtotal = getEligibleSubtotal(earningItems, settings);
      const orderId = randomBytes(12).toString("hex");
      order = await this.database.transaction(async (tx) => {
        let created = await this.insertOrder(
          {
            userId: String(customer._id),
            items: prepared.items,
            shippingAddress: {
              fullName: address.fullName || customer.name || "",
              phone: address.phone || customer.phone || "",
              street: address.street,
              city: address.city,
              state: address.state,
              postcode: address.postcode,
              country: address.country || "Bangladesh",
            },
            totalAmount,
            shippingFee,
            coupon: { code: coupon.code, discount: coupon.discount },
            loyalty: {
              pointsRedeemed: 0,
              discount: 0,
              pointsEstimated: settings.enabled
                ? estimateEarnedPoints(earningItems, settings)
                : 0,
              pointsEarned: 0,
              eligibleSubtotal,
              refundedAmount: 0,
            },
            payment: {
              method,
              status: paymentStatus,
              ...(paymentStatus === "paid" ? { paidAt: new Date() } : {}),
            },
            orderStatus,
            note: String(input.note || "")
              .trim()
              .slice(0, 500),
            orderNumber: await getNextOrderNumber(),
          },
          tx,
          orderId,
        );
        if (orderStatus === "delivered") {
          const pointsEarned = await this.loyaltyService.awardDeliveredOrder(
            tx,
            { ...created, id: orderId, userId: String(customer._id) },
            settings,
          );
          if (pointsEarned) {
            created = await this.updateLoyalty(tx, orderId, {
              ...created.loyalty,
              pointsEarned,
            });
          }
        }
        return created;
      });
    } catch (error) {
      await this.restoreStock(prepared.deducted);
      throw error;
    }
    await this.recordCouponUse(coupon.promo);

    this.notifyPlaced(order, customer);
    await createNotification({
      category: "order",
      title: "New order created by staff",
      description: `Order ${order.orderNumber} created for ${customer.name} by ${actor.name || "admin"} for ৳${totalAmount}.`,
      link: `/admin/orders/${order._id}`,
      order: order._id,
    });
    await createCustomerNotification({
      userId: String(customer._id),
      category: "order",
      title: `Order ${order.orderNumber} received`,
      description: `Your order was created. Its current status is ${formatOrderStatus(order.orderStatus)}.`,
      order: order._id,
    });

    const populated = await this.populateUser(order);
    return {
      order: populated,
      summary: {
        subtotal: prepared.subtotal,
        shippingFee,
        couponDiscount: coupon.discount,
        totalAmount,
      },
    };
  }

  async findMine(userId) {
    const rows = await this.database
      .select()
      .from(customerOrders)
      .where(eq(customerOrders.userId, String(userId)))
      .orderBy(desc(customerOrders.createdAt));
    return Promise.all(
      rows.map((row) => this.populateItems(serializeOrder(row))),
    );
  }

  async findById(id) {
    const [row] = await this.database
      .select()
      .from(customerOrders)
      .where(eq(customerOrders.id, id))
      .limit(1);
    if (!row) return null;
    return this.populateUser(await this.populateItems(serializeOrder(row)));
  }

  async findAll({ status, search, page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
    const conditions = [];
    if (status) conditions.push(eq(customerOrders.orderStatus, String(status)));

    const searchText = String(search || "").trim();
    if (searchText) {
      const pattern = `%${searchText}%`;
      const matchingUsers = await searchUsers(searchText, this.database);
      const matchingUserIds = matchingUsers.map((user) => String(user._id));
      const searchConditions = [
        sql`(
        ${customerOrders.shippingAddress}->>'city' ILIKE ${pattern}
        OR ${customerOrders.shippingAddress}->>'street' ILIKE ${pattern}
        OR ${customerOrders.payment}->>'tran_id' ILIKE ${pattern}
        OR ${customerOrders.items}::text ILIKE ${pattern}
        OR ${customerOrders.orderNumber} ILIKE ${pattern}
      )`,
      ];
      if (matchingUserIds.length) {
        searchConditions.push(inArray(customerOrders.userId, matchingUserIds));
      } else if (/^[a-f\d]{24}$/i.test(searchText)) {
        searchConditions.push(eq(customerOrders.userId, searchText));
      }
      conditions.push(or(...searchConditions));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const rowsQuery = this.database
      .select()
      .from(customerOrders)
      .orderBy(desc(customerOrders.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);
    const countQuery = this.database
      .select({ count: sql`count(*)::int` })
      .from(customerOrders);
    const [rows, countRows] = await Promise.all([
      where ? rowsQuery.where(where) : rowsQuery,
      where ? countQuery.where(where) : countQuery,
    ]);

    const orders = await Promise.all(
      rows.map(async (row) =>
        this.populateUser(await this.populateItems(serializeOrder(row))),
      ),
    );
    const total = countRows[0]?.count ?? 0;
    return {
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / limitNum)),
      orders,
    };
  }

  async getStats() {
    const rows = await this.database
      .select({
        status: customerOrders.orderStatus,
        count: sql`count(*)::int`,
      })
      .from(customerOrders)
      .groupBy(customerOrders.orderStatus);
    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      confirmed: 0,
      send_courier: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const row of rows) {
      if (Object.hasOwn(stats, row.status)) stats[row.status] = row.count;
    }
    stats.total = Object.values(stats).reduce((sum, value) => sum + value, 0);
    return stats;
  }

  async updateStatus(id, status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new BadRequestException({
        success: false,
        message: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}`,
      });
    }
    const settings = await this.loyaltyService.getSettings();
    const result = await this.database.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(customerOrders)
        .where(eq(customerOrders.id, id))
        .for("update")
        .limit(1);
      if (!row) return null;
      const order = serializeOrder(row);
      const previousStatus = order.orderStatus;
      if (previousStatus === status) return { order, previousStatus };
      if (status === "cancelled") {
        await this.loyaltyService.cancelOrderPoints(tx, {
          ...order,
          id: row.id,
          userId: row.userId,
        });
      }
      let loyalty = order.loyalty;
      if (status === "delivered") {
        const pointsEarned = await this.loyaltyService.awardDeliveredOrder(
          tx,
          { ...order, id: row.id, userId: row.userId },
          settings,
        );
        if (pointsEarned) loyalty = { ...loyalty, pointsEarned };
      }
      const [updatedRow] = await tx
        .update(customerOrders)
        .set({ orderStatus: status, loyalty, updatedAt: new Date() })
        .where(eq(customerOrders.id, id))
        .returning();
      return { order: serializeOrder(updatedRow), previousStatus };
    });
    if (!result) return null;
    const { order, previousStatus } = result;
    const updated = await this.populateUser(order);
    if (status === "cancelled" && previousStatus !== "cancelled") {
      await this.restoreStock(
        order.items.map((item) => ({
          product: String(item.product?._id ?? item.product),
          ...(item.variantId ? { variantId: item.variantId } : {}),
          quantity: item.quantity,
        })),
      );
    }
    if (previousStatus !== status) {
      const user = await findUserById(order.user?._id ?? order.user, {
        database: this.database,
      });
      if (user?.phone) {
        this.notify(() =>
          notifyOrderStatusChange({
            order: updated,
            status,
            name: user.name || "Customer",
            phone: user.phone,
          }),
        );
      }
      if (user?.email) {
        this.notify(() =>
          notifyOrderStatusEmail({
            order: updated,
            status,
            name: user.name || "Customer",
            email: user.email,
          }),
        );
      }
      const label =
        status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
      await createNotification({
        category: "order",
        title: `Order ${label}`,
        description: `Order ${updated.orderNumber} status is now ${label}.`,
        link: `/admin/orders?id=${updated._id}`,
        order: updated._id,
      });
      await createCustomerNotification({
        userId: String(order.user?._id ?? order.user),
        category: "order",
        title: `Order ${updated.orderNumber} ${formatOrderStatus(status)}`,
        description: `Your order status changed from ${formatOrderStatus(previousStatus)} to ${formatOrderStatus(status)}.`,
        order: updated._id,
      });
    }
    return updated;
  }

  async refundOrder(id, input, actor) {
    await this.loyaltyService.assertPermission(actor, "manage");
    const amount = Number(input?.amount);
    const reason = String(input?.reason ?? "").trim();
    const idempotencyKey = String(input?.idempotencyKey ?? "").trim();
    if (
      !/^[\w:.-]{8,150}$/.test(idempotencyKey) ||
      reason.length < 3 ||
      reason.length > 500
    ) {
      throw new BadRequestException({
        success: false,
        message: "A valid idempotency key and refund reason are required",
      });
    }
    const result = await this.database.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(customerOrders)
        .where(eq(customerOrders.id, id))
        .for("update")
        .limit(1);
      if (!row) return null;
      const order = serializeOrder(row);
      const refund = await this.loyaltyService.recordRefund(
        tx,
        { ...order, id: row.id, userId: row.userId },
        amount,
        idempotencyKey,
        reason,
        String(actor._id ?? actor.id),
      );
      if (refund.duplicate) return { order, duplicate: true };
      const [updatedRow] = await tx
        .update(customerOrders)
        .set({ loyalty: refund.loyalty, updatedAt: new Date() })
        .where(eq(customerOrders.id, id))
        .returning();
      return { order: serializeOrder(updatedRow), duplicate: false };
    });
    if (!result) return null;
    return {
      order: await this.populateUser(result.order),
      duplicate: result.duplicate,
    };
  }

  async updatePaymentStatus(id, inputStatus) {
    const status = String(inputStatus || "");
    const statuses = {
      Pending: "pending",
      Paid: "paid",
      Failed: "failed",
      Cancelled: "cancelled",
    };
    if (!statuses[status]) {
      throw new BadRequestException({
        success: false,
        message: "Invalid payment status",
      });
    }
    const order = await this.findById(id);
    if (!order) return null;
    const previousStatus = order.payment.status;
    const payment = { ...order.payment, status: statuses[status] };
    if (statuses[status] === "paid") {
      payment.paidAt = payment.paidAt || new Date();
    } else {
      delete payment.paidAt;
    }
    const updated = await this.update(id, { payment });
    if (previousStatus !== "paid" && payment.status === "paid") {
      await this.notifyPayment(updated);
    }
    return updated;
  }

  async updateAdvance(id, input) {
    const order = await this.findById(id);
    if (!order) return null;
    const advanceAmount =
      input.advanceAmount === undefined
        ? order.advanceAmount
        : validNonnegative(input.advanceAmount, "Invalid advance amount");
    let advancePaid =
      input.advancePaid === undefined
        ? order.advancePaid
        : validNonnegative(input.advancePaid, "Invalid advance paid amount");
    if (advancePaid > advanceAmount && advanceAmount > 0) {
      advancePaid = advanceAmount;
    }
    const payment = { ...order.payment };
    if (advancePaid >= order.totalAmount && advancePaid > 0) {
      payment.status = "paid";
      payment.amount = advancePaid || payment.amount;
      payment.paidAt = payment.paidAt || new Date();
    } else if (payment.status === "paid") {
      payment.status = "pending";
      delete payment.paidAt;
    }
    const updated = await this.update(id, {
      advanceAmount,
      advancePaid,
      advanceReference:
        input.advanceReference === undefined
          ? order.advanceReference
          : String(input.advanceReference || "").trim(),
      payment,
    });
    if (order.payment.status !== "paid" && payment.status === "paid") {
      await createNotification({
        category: "payment",
        title: "Advance payment received",
        description: `Order ${updated.orderNumber} is now fully paid (advance ৳${updated.advancePaid}).`,
        link: `/admin/orders?id=${updated._id}`,
        order: updated._id,
      });
    }
    return updated;
  }

  async update(id, changes) {
    const values = { ...changes, updatedAt: new Date() };
    const [row] = await this.database
      .update(customerOrders)
      .set(values)
      .where(eq(customerOrders.id, id))
      .returning();
    return row ? serializeOrder(row) : null;
  }

  async updateLoyalty(database, id, loyalty) {
    const [row] = await database
      .update(customerOrders)
      .set({ loyalty, updatedAt: new Date() })
      .where(eq(customerOrders.id, id))
      .returning();
    if (!row) throw new Error("Failed to update order loyalty");
    return serializeOrder(row);
  }

  async findByTransactionId(transactionId) {
    const [row] = await this.database
      .select()
      .from(customerOrders)
      .where(sql`${customerOrders.payment}->>'tran_id' = ${transactionId}`)
      .limit(1);
    return row ? serializeOrder(row) : null;
  }

  async insertOrder(
    values,
    database = this.database,
    id = randomBytes(12).toString("hex"),
  ) {
    const [row] = await database
      .insert(customerOrders)
      .values({ id, ...values })
      .returning();
    if (!row) throw new Error("Failed to create order");
    return serializeOrder(row);
  }

  async populateUser(order) {
    const [user] = await findUsersByIds([order.user], {
      fields: ["name", "email", "phone"],
      database: this.database,
    });
    return { ...order, user: user ?? order.user };
  }

  async populateItems(order) {
    const items = await Promise.all(
      order.items.map(async (item) => {
        const product = await findProductById(item.product, this.database);
        return {
          ...item,
          ...(product
            ? {
                product: {
                  _id: product._id,
                  name: product.name,
                  images: product.images,
                },
              }
            : {}),
        };
      }),
    );
    return { ...order, items };
  }

  async prepareItems(inputItems, admin) {
    if (!Array.isArray(inputItems) || inputItems.length === 0) {
      throw new BadRequestException({
        success: false,
        message: "No items in order",
      });
    }
    const items = [];
    const promoItems = [];
    const loyaltyItems = [];
    const deducted = [];
    let subtotal = 0;
    try {
      for (const item of inputItems) {
        const quantity = Number(item?.quantity);
        if (!item?.product || !Number.isInteger(quantity) || quantity < 1) {
          throw new BadRequestException({
            success: false,
            message: "Each item must have a product ID and quantity ≥ 1",
          });
        }
        const product = await findProductById(item.product, this.database);
        if (!product) {
          throw new NotFoundException({
            success: false,
            message: `${admin ? "Product not found: " : "Product "}${item.product}${admin ? "" : " not found"}`,
          });
        }
        if (admin && product.status !== "active") {
          throw new BadRequestException({
            success: false,
            message: `Product "${product.name}" is not available`,
          });
        }
        const variantId =
          typeof item?.variantId === "string" ? item.variantId : "";
        const purchase = resolveProductPurchase(product, variantId);
        const { variant, price, image, variantLabel } = purchase;
        assertProductPurchaseStock(purchase, quantity, product.name);
        subtotal += price * quantity;
        items.push({
          product: String(product._id),
          name: product.name,
          price,
          quantity,
          image,
          ...(variant
            ? {
                variantId: variant._id,
                variantLabel,
                sku: purchase.sku,
                variant: {
                  color: variant.color || "",
                  storage: variant.storage || "",
                  ram: variant.ram || "",
                },
              }
            : {}),
        });
        promoItems.push({
          categories:
            Array.isArray(product.categories) && product.categories.length
              ? product.categories
              : product.category
                ? [product.category]
                : [],
          price,
          quantity,
        });
        loyaltyItems.push({
          product: {
            _id: String(product._id),
            category: product.category,
            categories: product.categories,
          },
          price,
          quantity,
        });
        const stockUpdated = variant
          ? await changeProductVariantStock(
              product._id,
              variant._id,
              -quantity,
              { requireAvailable: true },
              this.database,
            )
          : await changeProductStock(
              product._id,
              -quantity,
              { requireAvailable: true },
              this.database,
            );
        if (!stockUpdated) {
          throw new BadRequestException({
            success: false,
            message: `Insufficient stock for ${product.name}${variantLabel ? ` (${variantLabel})` : ""}`,
          });
        }
        deducted.push({
          product: String(product._id),
          ...(variant ? { variantId: variant._id } : {}),
          quantity,
        });
      }
    } catch (error) {
      await this.restoreStock(deducted);
      throw error;
    }
    return { items, promoItems, loyaltyItems, subtotal, deducted };
  }

  async applyCoupon(code, prepared) {
    if (typeof code !== "string" || !code.trim()) {
      return { code: "", discount: 0, promo: null };
    }
    const [promo] = await this.database
      .select()
      .from(promoCodeEntries)
      .where(eq(promoCodeEntries.code, code.trim().toUpperCase()))
      .limit(1);
    if (!promo) return { code: "", discount: 0, promo: null };
    const result = computePromoItemDiscount(
      promo,
      prepared.promoItems,
      prepared.subtotal,
      await expandPromoCategories(promo.categories || []),
    );
    if (!result.valid) return { code: "", discount: 0, promo: null };
    return { code: promo.code, discount: result.discount, promo };
  }

  async recordCouponUse(promo) {
    if (!promo) return;
    await this.database
      .update(promoCodeEntries)
      .set({
        usageCount: sql`${promoCodeEntries.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(promoCodeEntries.id, promo.id));
  }

  async restoreStock(items) {
    for (const item of items) {
      if (item.variantId) {
        await changeProductVariantStock(
          item.product,
          item.variantId,
          item.quantity,
          {},
          this.database,
        );
      } else {
        await changeProductStock(
          item.product,
          item.quantity,
          {},
          this.database,
        );
      }
    }
  }

  notifyPlaced(order, user) {
    if (user.phone) {
      this.notify(() =>
        notifyOrderStatusChange({
          order,
          status: order.orderStatus,
          name: user.name || "Customer",
          phone: user.phone,
        }),
      );
    }
    if (user.email) {
      this.notify(() =>
        notifyOrderConfirmation({
          order,
          name: user.name || "Customer",
          email: user.email,
        }),
      );
    }
  }

  notify(callback) {
    callback().catch((error) => {
      console.error("Order notification failed:", error.message);
    });
  }

  async notifyPayment(order) {
    await createNotification({
      category: "payment",
      title: "Payment confirmed",
      description: `Payment of ৳${order.totalAmount} for order ${order.orderNumber} is confirmed.`,
      link: `/admin/orders?id=${order._id}`,
      order: order._id,
    });
  }
}

function validNonnegative(value, message) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new BadRequestException({ success: false, message });
  }

  function formatOrderStatus(status) {
    return String(status || "")
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return number;
}

function applyCouponToLoyaltyItems(items, subtotal, discount) {
  const scale =
    subtotal > 0
      ? Math.max(0, (subtotal - Math.max(0, Number(discount) || 0)) / subtotal)
      : 0;
  return items.map((item) => ({
    ...item,
    price: item.price * scale,
  }));
}

function validateShippingAddress(address) {
  if (
    !address ||
    !address.street ||
    !address.city ||
    !address.state ||
    !address.postcode
  ) {
    throw new BadRequestException({
      success: false,
      message: "Shipping address (street, city, state, postcode) is required",
    });
  }
}

function serializeOrder(row) {
  const order = {
    _id: row.id,
    user: row.userId,
    items: row.items || [],
    shippingAddress: row.shippingAddress || {},
    totalAmount: row.totalAmount,
    shippingFee: Number(row.shippingFee ?? 0),
    coupon: row.coupon || { code: "", discount: 0 },
    loyalty: row.loyalty || {},
    payment: row.payment || { method: "sslcommerz", status: "pending" },
    orderStatus: row.orderStatus,
    note: row.note,
    orderNumber: row.orderNumber,
    advanceAmount: row.advanceAmount,
    advancePaid: row.advancePaid,
    advanceReference: row.advanceReference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  Object.defineProperty(order, "save", {
    enumerable: false,
    value: async function save() {
      const saved = await persistOrder(this);
      Object.assign(this, saved);
      return this;
    },
  });
  return order;
}

async function findOrderById(id) {
  const [row] = await getDatabase()
    .select()
    .from(customerOrders)
    .where(eq(customerOrders.id, id))
    .limit(1);
  return row ? serializeOrder(row) : null;
}

async function findOrderByTranId(transactionId) {
  const [row] = await getDatabase()
    .select()
    .from(customerOrders)
    .where(sql`${customerOrders.payment}->>'tran_id' = ${transactionId}`)
    .limit(1);
  return row ? serializeOrder(row) : null;
}

async function findAllOrdersForReporting() {
  const rows = await getDatabase()
    .select()
    .from(customerOrders)
    .orderBy(desc(customerOrders.createdAt));
  return rows.map(serializeOrder);
}

async function persistOrder(order) {
  const [row] = await getDatabase()
    .update(customerOrders)
    .set({
      userId: String(order.user?._id ?? order.user),
      items: order.items,
      shippingAddress: order.shippingAddress,
      totalAmount: Number(order.totalAmount),
      shippingFee: Number(order.shippingFee ?? 0),
      coupon: order.coupon,
      loyalty: order.loyalty ?? {},
      payment: order.payment,
      orderStatus: order.orderStatus,
      note: order.note ?? "",
      orderNumber: order.orderNumber,
      advanceAmount: Number(order.advanceAmount || 0),
      advancePaid: Number(order.advancePaid || 0),
      advanceReference: order.advanceReference || "",
      updatedAt: new Date(),
    })
    .where(eq(customerOrders.id, order._id))
    .returning();
  if (!row) throw new Error("Failed to save order");
  return serializeOrder(row);
}

Injectable()(OrdersService);
Inject(DATABASE)(OrdersService, undefined, 0);
Inject(LoyaltyService)(OrdersService, undefined, 1);

export {
  findOrderById,
  findOrderByTranId,
  findAllOrdersForReporting,
  applyCouponToLoyaltyItems,
  OrdersService,
  persistOrder,
  serializeOrder,
};
