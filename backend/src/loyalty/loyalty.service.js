import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { loyaltySettings } from "../models/LoyaltySettings.js";
import { loyaltyTransactions } from "../models/LoyaltyTransaction.js";
import { customerOrders } from "../db/schema.js";
import { userEntries, serializeUser } from "../models/User.js";
import {
  computePromoItemDiscount,
  promoCodeEntries,
} from "../models/PromoCode.js";
import { expandPromoCategories } from "../utils/categoryTree.js";
import { findPermissionGroupById } from "../permission-groups/permission-groups.repository.js";
import {
  findProductById,
  resolveProductPurchase,
} from "../products/products.repository.js";
import { hasPermission, resolvePermissions } from "../utils/permissions.js";

const grantRows = alias(loyaltyTransactions, "grant_row");

const DEFAULT_SETTINGS = Object.freeze({
  id: "default",
  enabled: true,
  pointsPerHundred: 1,
  pointValue: 0.1,
  minimumRedemption: 500,
  maximumRedemptionPercent: 10,
  expirationDays: 365,
  productOverrides: [],
  categoryOverrides: [],
});

class LoyaltyService {
  constructor(database) {
    this.database = database;
  }

  async getSettings() {
    const [settings] = await this.database
      .select()
      .from(loyaltySettings)
      .where(eq(loyaltySettings.id, "default"))
      .limit(1);
    return settings ?? { ...DEFAULT_SETTINGS };
  }

  async saveSettings(input, actor) {
    await this.assertPermission(actor, "edit");
    const current = await this.getSettings();
    const values = validateSettings({ ...current, ...input });
    const [saved] = await this.database
      .insert(loyaltySettings)
      .values({ id: "default", ...values, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: loyaltySettings.id,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return saved;
  }

  async estimateProduct(productId, variantId = "") {
    const product = await findProductById(productId, this.database);
    if (!product) throw notFound("Product not found");
    const purchase = resolveProductPurchase(product, variantId);
    const settings = await this.getSettings();
    return {
      enabled: settings.enabled,
      points: settings.enabled
        ? estimateEarnedPoints(
            [{ product, price: purchase.price, quantity: 1 }],
            settings,
          )
        : 0,
    };
  }

  async quote(customerId, inputItems, couponCode = "") {
    const settings = await this.getSettings();
    const balance = await this.getBalance(customerId);
    const products = await this.prepareQuoteItems(inputItems);
    const subtotal = products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const promoItems = products.map((item) => ({
      categories:
        Array.isArray(item.product.categories) && item.product.categories.length
          ? item.product.categories
          : item.product.category
            ? [item.product.category]
            : [],
      price: item.price,
      quantity: item.quantity,
    }));
    let couponDiscount = 0;
    if (typeof couponCode === "string" && couponCode.trim()) {
      const [promo] = await this.database
        .select()
        .from(promoCodeEntries)
        .where(eq(promoCodeEntries.code, couponCode.trim().toUpperCase()))
        .limit(1);
      if (promo) {
        const discount = computePromoItemDiscount(
          promo,
          promoItems,
          subtotal,
          await expandPromoCategories(promo.categories || []),
        );
        if (discount.valid) couponDiscount = Number(discount.discount);
      }
    }
    const scale =
      subtotal > 0 ? Math.max(0, (subtotal - couponDiscount) / subtotal) : 0;
    const earningItems = products.map((item) => ({
      ...item,
      price: item.price * scale,
    }));
    const eligibleSubtotal = getEligibleSubtotal(earningItems, settings);
    const maximumRedeemPoints = settings.enabled
      ? Math.floor(
          (eligibleSubtotal * settings.maximumRedemptionPercent) /
            100 /
            settings.pointValue,
        )
      : 0;
    return {
      enabled: settings.enabled,
      balance,
      estimatedPoints: settings.enabled
        ? estimateEarnedPoints(earningItems, settings)
        : 0,
      eligibleSubtotal,
      couponDiscount,
      minimumRedemption: settings.minimumRedemption,
      maximumRedeemPoints,
      maximumDiscount: roundMoney(maximumRedeemPoints * settings.pointValue),
      pointValue: settings.pointValue,
    };
  }

  async getCustomerSummary(customerId, { page = 1, limit = 20 } = {}) {
    const user = await this.findCustomer(customerId);
    const summary = await this.getBalanceSummary(customerId);
    const pendingRows = await this.database
      .select({
        points: sql`coalesce(sum(coalesce((${customerOrders.loyalty}->>'pointsEstimated')::int, 0)), 0)::int`,
      })
      .from(customerOrders)
      .where(
        and(
          eq(customerOrders.userId, customerId),
          sql`${customerOrders.orderStatus} not in ('delivered', 'cancelled')`,
        ),
      );
    const history = await this.getTransactions(customerId, { page, limit });
    return {
      customer: user,
      balance: summary.balance,
      expiringPoints: summary.expiringPoints,
      nextExpiration: summary.nextExpiration,
      pendingPoints: Math.max(0, Number(pendingRows[0]?.points ?? 0)),
      transactions: history.transactions,
      total: history.total,
      page: history.page,
      pages: history.pages,
    };
  }

  async getTransactions(customerId, { page = 1, limit = 20 } = {}) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const [countRow] = await this.database
      .select({ total: sql`count(*)::int` })
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, customerId));
    const rows = await this.database
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, customerId))
      .orderBy(
        desc(loyaltyTransactions.createdAt),
        desc(loyaltyTransactions.id),
      )
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize);
    const total = Number(countRow?.total ?? 0);
    return {
      transactions: rows,
      total,
      page: pageNumber,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getAdminSummary(actor) {
    await this.assertPermission(actor, "view");
    const [customers] = await this.database
      .select({ total: sql`count(*)::int` })
      .from(userEntries)
      .where(eq(userEntries.role, "customer"));
    const [totals] = await this.database
      .select({
        earned: sql`coalesce(sum(case when ${loyaltyTransactions.type} = 'earn' then ${loyaltyTransactions.points} else 0 end), 0)::int`,
        redeemed: sql`coalesce(sum(case when ${loyaltyTransactions.type} = 'redeem' then -${loyaltyTransactions.points} else 0 end), 0)::int`,
        adjusted: sql`coalesce(sum(case when ${loyaltyTransactions.type} = 'adjustment' then ${loyaltyTransactions.points} else 0 end), 0)::int`,
      })
      .from(loyaltyTransactions);
    const [activePoints] = await this.database
      .select({
        total: sql`coalesce(sum(${loyaltyTransactions.points}), 0)::int`,
      })
      .from(loyaltyTransactions)
      .where(
        sql`${loyaltyTransactions.grantId} is null or exists (
          select 1 from loyalty_transactions grant_row
          where grant_row.id = ${loyaltyTransactions.grantId}
            and (grant_row.expires_at is null or grant_row.expires_at > now())
        )`,
      );
    return {
      customers: Number(customers?.total ?? 0),
      activePoints: Number(activePoints?.total ?? 0),
      pointsEarned: Number(totals?.earned ?? 0),
      pointsRedeemed: Number(totals?.redeemed ?? 0),
      manualAdjustments: Number(totals?.adjusted ?? 0),
    };
  }

  async listCustomers(actor, { page = 1, limit = 20, search = "" } = {}) {
    await this.assertPermission(actor, "view");
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const filters = [eq(userEntries.role, "customer")];
    const query = String(search || "").trim();
    if (query) {
      const pattern = `%${query}%`;
      filters.push(
        sql`(${userEntries.name} ilike ${pattern} or ${userEntries.email} ilike ${pattern} or ${userEntries.phone} ilike ${pattern})`,
      );
    }
    const where = and(...filters);
    const [countRow] = await this.database
      .select({ total: sql`count(*)::int` })
      .from(userEntries)
      .where(where);
    const rows = await this.database
      .select()
      .from(userEntries)
      .where(where)
      .orderBy(desc(userEntries.createdAt))
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize);
    const customerIds = rows.map((row) => row.id);
    const balances = await this.getBalances(customerIds);
    const total = Number(countRow?.total ?? 0);
    return {
      customers: rows.map((row) => ({
        ...serializeUser(row),
        loyaltyBalance: balances.get(row.id) ?? 0,
      })),
      total,
      page: pageNumber,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getAdminCustomer(customerId, actor, pagination) {
    await this.assertPermission(actor, "view");
    const summary = await this.getCustomerSummary(customerId, pagination);
    const { customer, ...rewards } = summary;
    return { customer, ...rewards };
  }

  async adjustPoints(customerId, input, actor) {
    await this.assertPermission(actor, "manage");
    const points = Number(input?.points);
    const reason = String(input?.reason ?? "").trim();
    const idempotencyKey = validateIdempotencyKey(input?.idempotencyKey);
    if (
      !Number.isSafeInteger(points) ||
      points === 0 ||
      Math.abs(points) > 1_000_000
    ) {
      throw badRequest("Adjustment must be a non-zero whole number of points");
    }
    if (reason.length < 3 || reason.length > 500) {
      throw badRequest("A reason between 3 and 500 characters is required");
    }

    return this.database.transaction(async (tx) => {
      await this.lockCustomer(tx, customerId);
      await this.findCustomer(customerId, tx);
      if (points < 0 && (await this.getBalance(customerId, tx)) < -points) {
        throw badRequest("Adjustment exceeds the customer's available balance");
      }
      const transaction = await this.insertTransaction(tx, {
        customerId,
        type: "adjustment",
        points,
        idempotencyKey: `adjust:${customerId}:${idempotencyKey}`,
        reason,
        ...(points > 0
          ? {
              expiresAt: this.expirationDate(
                await this.getSettings(),
                new Date(),
              ),
            }
          : {}),
        metadata: { actorId: String(actor._id ?? actor.id) },
      });
      return { transaction, balance: await this.getBalance(customerId, tx) };
    });
  }

  async createRedemption(
    tx,
    { customerId, orderId, points, eligibleSubtotal, settings },
  ) {
    const requestedPoints = Number(points);
    if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0) {
      throw badRequest("Redeemed points must be a non-negative whole number");
    }
    if (requestedPoints === 0) return { points: 0, discount: 0 };
    await this.lockCustomer(tx, customerId);
    const redemption = calculateRedemption(
      requestedPoints,
      await this.getBalance(customerId, tx),
      eligibleSubtotal,
      settings,
    );
    const requested = redemption.points;

    const grants = await this.getAvailableGrants(customerId, tx);
    let remaining = requested;
    let index = 0;
    for (const grant of grants) {
      if (remaining <= 0) break;
      const allocated = Math.min(remaining, grant.points);
      await this.insertTransaction(tx, {
        customerId,
        orderId,
        grantId: grant.grantId,
        type: "redeem",
        points: -allocated,
        idempotencyKey: `redeem:${orderId}:${index++}`,
        reason: `Redeemed on order ${orderId}`,
        metadata: { sourceGrantId: grant.grantId },
      });
      remaining -= allocated;
    }
    if (remaining > 0) {
      throw new Error("Loyalty balance changed while allocating redemption");
    }
    return redemption;
  }

  async awardDeliveredOrder(tx, order, settings) {
    if (!settings.enabled || !order.loyalty?.pointsEstimated) return 0;
    const idempotencyKey = `delivery:${order.id}`;
    const alreadyAwarded = await this.hasIdempotencyKey(idempotencyKey, tx);
    if (alreadyAwarded) return 0;
    const points = Math.floor(
      Number(order.loyalty.pointsEstimated) *
        Math.max(
          0,
          1 -
            Number(order.loyalty.refundedAmount ?? 0) /
              Math.max(1, Number(order.totalAmount)),
        ),
    );
    if (!Number.isSafeInteger(points) || points < 1) return 0;
    const expiresAt = this.expirationDate(settings, new Date());
    await this.insertTransaction(tx, {
      customerId: order.userId,
      orderId: order.id,
      type: "earn",
      points,
      idempotencyKey,
      reason: `Points earned for delivered order ${order.orderNumber || order.id}`,
      ...(expiresAt ? { expiresAt } : {}),
      metadata: { eligibleSubtotal: order.loyalty.eligibleSubtotal ?? 0 },
    });
    return points;
  }

  async restoreOrderRedemption(tx, order, reason, idempotencyPrefix) {
    const rows = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(-${loyaltyTransactions.points})::int`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, order.id),
          eq(loyaltyTransactions.type, "redeem"),
          isNotNull(loyaltyTransactions.grantId),
        ),
      )
      .groupBy(loyaltyTransactions.grantId);
    const restored = await this.restoredPointsByGrant(order.id, tx);
    for (const row of rows) {
      const amount = Number(row.points) - (restored.get(row.grantId) ?? 0);
      if (amount <= 0) continue;
      await this.insertTransaction(tx, {
        customerId: order.userId,
        orderId: order.id,
        grantId: row.grantId,
        type: "restore",
        points: amount,
        idempotencyKey: `${idempotencyPrefix}:${row.grantId}`,
        reason,
        metadata: { sourceGrantId: row.grantId },
      });
    }
  }

  async cancelOrderPoints(tx, order) {
    await this.lockCustomer(tx, order.userId);
    await this.restoreOrderRedemption(
      tx,
      order,
      `Redeemed points restored for cancelled order ${order.orderNumber || order.id}`,
      `cancel:${order.id}:restore`,
    );
    const earned = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(${loyaltyTransactions.points})::int`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, order.id),
          eq(loyaltyTransactions.type, "earn"),
          isNotNull(loyaltyTransactions.grantId),
        ),
      )
      .groupBy(loyaltyTransactions.grantId);
    const refunded = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(-${loyaltyTransactions.points})::int`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, order.id),
          eq(loyaltyTransactions.type, "refund"),
          isNotNull(loyaltyTransactions.grantId),
        ),
      )
      .groupBy(loyaltyTransactions.grantId);
    const refundedByGrant = new Map(
      refunded.map((row) => [row.grantId, Number(row.points)]),
    );
    for (const grant of earned) {
      const points =
        Number(grant.points) - (refundedByGrant.get(grant.grantId) ?? 0);
      if (points > 0) {
        await this.insertTransaction(tx, {
          customerId: order.userId,
          orderId: order.id,
          grantId: grant.grantId,
          type: "refund",
          points: -points,
          idempotencyKey: `cancel:${order.id}:earned:${grant.grantId}`,
          reason: `Earned points reversed for cancelled order ${order.orderNumber || order.id}`,
        });
      }
    }
  }

  async recordRefund(tx, order, amount, idempotencyKey, reason, actorId) {
    await this.lockCustomer(tx, order.userId);
    const eventKey = `${order.id}:${idempotencyKey}`;
    const moneyKey = `refund:${eventKey}:money`;
    if (await this.hasIdempotencyKey(moneyKey, tx)) {
      return {
        duplicate: true,
        refundedAmount: Number(order.loyalty?.refundedAmount ?? 0),
        loyalty: order.loyalty || {},
      };
    }
    const refundedBefore = Number(order.loyalty?.refundedAmount ?? 0);
    const totalAmount = Number(order.totalAmount);
    const refundAmount = roundMoney(amount);
    if (
      !Number.isFinite(amount) ||
      refundAmount <= 0 ||
      refundedBefore + refundAmount > totalAmount + 0.001
    ) {
      throw badRequest("Refund amount exceeds the remaining order total");
    }
    const refundedAfter = roundMoney(refundedBefore + refundAmount);
    const ratio = Math.min(1, refundedAfter / totalAmount);
    const redeemedByGrant = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(-${loyaltyTransactions.points})::int`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, order.id),
          eq(loyaltyTransactions.type, "redeem"),
          isNotNull(loyaltyTransactions.grantId),
        ),
      )
      .groupBy(loyaltyTransactions.grantId);
    const restored = await this.restoredPointsByGrant(order.id, tx);
    for (const grant of redeemedByGrant) {
      const total = Number(grant.points);
      const target = calculateRefundPointTarget(total, ratio);
      const points = target - (restored.get(grant.grantId) ?? 0);
      if (points > 0) {
        await this.insertTransaction(tx, {
          customerId: order.userId,
          orderId: order.id,
          grantId: grant.grantId,
          type: "restore",
          points,
          idempotencyKey: `refund:${eventKey}:redeem:${grant.grantId}`,
          reason: `Redeemed points restored for refund on order ${order.orderNumber || order.id}: ${reason}`,
          metadata: {
            sourceGrantId: grant.grantId,
            refundAmount,
          },
        });
      }
    }

    const earned = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(${loyaltyTransactions.points})::int`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, order.id),
          eq(loyaltyTransactions.type, "earn"),
          isNotNull(loyaltyTransactions.grantId),
        ),
      )
      .groupBy(loyaltyTransactions.grantId);
    const reversed = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(-${loyaltyTransactions.points})::int`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, order.id),
          eq(loyaltyTransactions.type, "refund"),
          isNotNull(loyaltyTransactions.grantId),
        ),
      )
      .groupBy(loyaltyTransactions.grantId);
    const reversedByGrant = new Map(
      reversed.map((row) => [row.grantId, Number(row.points)]),
    );
    for (const grant of earned) {
      const total = Number(grant.points);
      const target = calculateRefundPointTarget(total, ratio);
      const points = target - (reversedByGrant.get(grant.grantId) ?? 0);
      if (points > 0) {
        await this.insertTransaction(tx, {
          customerId: order.userId,
          orderId: order.id,
          grantId: grant.grantId,
          type: "refund",
          points: -points,
          idempotencyKey: `refund:${eventKey}:earned:${grant.grantId}`,
          reason: `Earned points reversed for refund on order ${order.orderNumber || order.id}: ${reason}`,
          metadata: { refundAmount },
        });
      }
    }
    await this.insertTransaction(tx, {
      customerId: order.userId,
      orderId: order.id,
      type: "refund",
      points: 0,
      idempotencyKey: moneyKey,
      reason: `Refund of ৳${refundAmount} recorded for order ${order.orderNumber || order.id}: ${reason}`,
      metadata: {
        refundAmount,
        refundedAmount: refundedAfter,
        actorId,
      },
    });
    return {
      duplicate: false,
      refundedAmount: refundedAfter,
      loyalty: { ...(order.loyalty || {}), refundedAmount: refundedAfter },
    };
  }

  async expirePoints() {
    const expiredGrants = await this.database
      .select({
        customerId: loyaltyTransactions.customerId,
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(${loyaltyTransactions.points})::int`,
        expiresAt: sql`max(${grantRows.expiresAt})`,
        orderId: sql`max(${loyaltyTransactions.orderId})`,
      })
      .from(loyaltyTransactions)
      .innerJoin(grantRows, eq(grantRows.id, loyaltyTransactions.grantId))
      .where(
        and(
          isNotNull(loyaltyTransactions.grantId),
          sql`${grantRows.expiresAt} <= now()`,
          sql`not exists (
            select 1 from loyalty_transactions already_expired
            where already_expired.idempotency_key = 'expire:' || ${loyaltyTransactions.grantId}
          )`,
        ),
      )
      .groupBy(loyaltyTransactions.customerId, loyaltyTransactions.grantId)
      .having(sql`sum(${loyaltyTransactions.points}) > 0`)
      .limit(500);
    let expired = 0;
    for (const grant of expiredGrants) {
      const pointsExpired = await this.database.transaction(async (tx) => {
        await this.lockCustomer(tx, grant.customerId);
        const [currentGrant] = await tx
          .select({
            points: sql`sum(${loyaltyTransactions.points})::int`,
            expiresAt: sql`max(${grantRows.expiresAt})`,
          })
          .from(loyaltyTransactions)
          .innerJoin(grantRows, eq(grantRows.id, loyaltyTransactions.grantId))
          .where(
            and(
              eq(loyaltyTransactions.customerId, grant.customerId),
              eq(loyaltyTransactions.grantId, grant.grantId),
            ),
          )
          .groupBy(loyaltyTransactions.customerId, loyaltyTransactions.grantId)
          .having(sql`sum(${loyaltyTransactions.points}) > 0`);
        if (
          !currentGrant ||
          new Date(currentGrant.expiresAt).getTime() > Date.now()
        ) {
          return 0;
        }
        const points = Number(currentGrant.points);
        await this.insertTransaction(tx, {
          customerId: grant.customerId,
          orderId: grant.orderId,
          grantId: grant.grantId,
          type: "expire",
          points: -points,
          idempotencyKey: `expire:${grant.grantId}`,
          reason: "Unredeemed points expired",
          metadata: { expiredAt: currentGrant.expiresAt },
        });
        return points;
      });
      expired += pointsExpired;
    }
    return { grantsExpired: expiredGrants.length, pointsExpired: expired };
  }

  async getBalance(customerId, database = this.database) {
    return (await this.getBalanceSummary(customerId, database)).balance;
  }

  async getBalanceSummary(customerId, database = this.database) {
    const rows = await database
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(${loyaltyTransactions.points})::int`,
        expiresAt: sql`max(${grantRows.expiresAt})`,
      })
      .from(loyaltyTransactions)
      .leftJoin(grantRows, eq(grantRows.id, loyaltyTransactions.grantId))
      .where(eq(loyaltyTransactions.customerId, customerId))
      .groupBy(loyaltyTransactions.grantId, grantRows.expiresAt);
    const now = Date.now();
    let balance = 0;
    const expiring = [];
    for (const row of rows) {
      const points = Number(row.points ?? 0);
      if (row.grantId === null || row.grantId === undefined) {
        balance += points;
      } else if (!row.expiresAt || new Date(row.expiresAt).getTime() > now) {
        balance += points;
        if (row.expiresAt) {
          expiring.push({
            points,
            expiresAt: new Date(row.expiresAt),
          });
        }
      }
    }
    expiring.sort((a, b) => a.expiresAt - b.expiresAt);
    return {
      balance: Math.max(0, balance),
      expiringPoints: expiring
        .filter((item) => item.expiresAt.getTime() <= now + 30 * 86400000)
        .reduce((sum, item) => sum + Math.max(0, item.points), 0),
      nextExpiration:
        expiring.find((item) => item.points > 0)?.expiresAt ?? null,
    };
  }

  async getBalances(customerIds) {
    const balances = new Map();
    if (!customerIds.length) return balances;
    const rows = await this.database
      .select({
        customerId: loyaltyTransactions.customerId,
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(${loyaltyTransactions.points})::int`,
        expiresAt: sql`max(${grantRows.expiresAt})`,
      })
      .from(loyaltyTransactions)
      .leftJoin(grantRows, eq(grantRows.id, loyaltyTransactions.grantId))
      .where(inArray(loyaltyTransactions.customerId, customerIds))
      .groupBy(
        loyaltyTransactions.customerId,
        loyaltyTransactions.grantId,
        grantRows.expiresAt,
      );
    const now = Date.now();
    for (const row of rows) {
      if (
        row.grantId === null ||
        !row.expiresAt ||
        new Date(row.expiresAt).getTime() > now
      ) {
        balances.set(
          row.customerId,
          (balances.get(row.customerId) ?? 0) + Number(row.points ?? 0),
        );
      }
    }
    return balances;
  }

  async getAvailableGrants(customerId, tx = this.database) {
    const rows = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(${loyaltyTransactions.points})::int`,
        expiresAt: sql`max(${grantRows.expiresAt})`,
      })
      .from(loyaltyTransactions)
      .leftJoin(grantRows, eq(grantRows.id, loyaltyTransactions.grantId))
      .where(eq(loyaltyTransactions.customerId, customerId))
      .groupBy(loyaltyTransactions.grantId, grantRows.expiresAt)
      .having(sql`sum(${loyaltyTransactions.points}) > 0`)
      .orderBy(asc(sql`${grantRows.expiresAt} nulls last`));
    const now = Date.now();
    return rows.filter(
      (row) =>
        row.grantId &&
        (!row.expiresAt || new Date(row.expiresAt).getTime() > now),
    );
  }

  async prepareQuoteItems(inputItems) {
    if (
      !Array.isArray(inputItems) ||
      !inputItems.length ||
      inputItems.length > 100
    ) {
      throw badRequest("Cart items are required");
    }
    const products = [];
    for (const item of inputItems) {
      const quantity = Number(item?.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw badRequest("Each item must have a valid quantity");
      }
      const product = await findProductById(item?.product, this.database);
      if (!product) throw notFound("Product not found");
      const purchase = resolveProductPurchase(product, item?.variantId || "");
      products.push({
        product,
        price: purchase.price,
        quantity,
      });
    }
    return products;
  }

  async getEligiblePriceItems(inputItems) {
    return inputItems.map((item) => ({
      product: {
        _id: item.product,
        category: item.category,
        categories: item.categories,
      },
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));
  }

  async assertPermission(actor, action) {
    const group = await findPermissionGroupById(
      actor.permissionGroup,
      this.database,
    );
    const permissions = resolvePermissions(actor, group);
    if (!hasPermission(permissions, "loyalty", action)) {
      throw new ForbiddenException({
        success: false,
        message: `You don't have permission to ${action} loyalty`,
      });
    }
  }

  async findCustomer(customerId, database = this.database) {
    const [row] = await database
      .select()
      .from(userEntries)
      .where(eq(userEntries.id, String(customerId)))
      .limit(1);
    if (!row || row.role !== "customer") throw notFound("Customer not found");
    return serializeUser(row);
  }

  async lockCustomer(tx, customerId) {
    await tx
      .select({ id: userEntries.id })
      .from(userEntries)
      .where(eq(userEntries.id, String(customerId)))
      .for("update");
  }

  async insertTransaction(database, values) {
    const rowId = randomBytes(12).toString("hex");
    const rowValues = {
      id: rowId,
      ...values,
      ...(["earn", "adjustment"].includes(values.type) &&
      values.points > 0 &&
      !values.grantId
        ? { grantId: rowId }
        : {}),
    };
    const [row] = await database
      .insert(loyaltyTransactions)
      .values(rowValues)
      .onConflictDoNothing({
        target: loyaltyTransactions.idempotencyKey,
      })
      .returning();
    if (row) return row;
    const [existing] = await database
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.idempotencyKey, values.idempotencyKey))
      .limit(1);
    if (!existing) throw new Error("Failed to record loyalty transaction");
    if (
      existing.customerId !== values.customerId ||
      existing.type !== values.type ||
      Number(existing.points) !== Number(values.points) ||
      (existing.orderId ?? null) !== (values.orderId ?? null) ||
      existing.reason !== values.reason
    ) {
      throw badRequest(
        "Idempotency key was already used for a different transaction",
      );
    }
    return existing;
  }

  async hasIdempotencyKey(idempotencyKey, database = this.database) {
    const [row] = await database
      .select({ id: loyaltyTransactions.id })
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.idempotencyKey, idempotencyKey))
      .limit(1);
    return Boolean(row);
  }

  async restoredPointsByGrant(orderId, tx = this.database) {
    const rows = await tx
      .select({
        grantId: loyaltyTransactions.grantId,
        points: sql`sum(${loyaltyTransactions.points})::int`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.orderId, orderId),
          eq(loyaltyTransactions.type, "restore"),
          isNotNull(loyaltyTransactions.grantId),
        ),
      )
      .groupBy(loyaltyTransactions.grantId);
    return new Map(rows.map((row) => [row.grantId, Number(row.points)]));
  }

  expirationDate(settings, date) {
    return settings.expirationDays > 0
      ? new Date(date.getTime() + settings.expirationDays * 86400000)
      : null;
  }

  async onModuleInit() {
    this.expirationTimer = setInterval(
      () => {
        this.expirePoints().catch((error) => {
          this.logExpirationFailure(error);
        });
      },
      24 * 60 * 60 * 1000,
    );
    this.expirationTimer.unref?.();
    this.expirePoints().catch((error) => {
      this.logExpirationFailure(error);
    });
  }

  logExpirationFailure(error) {
    const cause = getRootCause(error);
    if (cause?.code === "42P01") {
      console.error(
        "Loyalty point expiration failed because a database table is missing. Apply pending migrations with `npm run db:migrate` from the backend directory.",
        cause.message,
      );
      return;
    }
    console.error(
      "Loyalty point expiration failed:",
      cause?.message ?? error?.message ?? error,
    );
  }

  onModuleDestroy() {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }
}

function getRootCause(error) {
  let cause = error;
  while (cause?.cause && cause.cause !== cause) cause = cause.cause;
  return cause;
}

function estimateEarnedPoints(items, settings) {
  const totalsByRate = new Map();
  for (const item of items) {
    const rule = resolveEarningRule(item.product, settings);
    if (!rule.enabled) continue;
    const earnedSpend = Number(item.price) * Number(item.quantity);
    totalsByRate.set(
      rule.pointsPerHundred,
      (totalsByRate.get(rule.pointsPerHundred) ?? 0) + earnedSpend,
    );
  }
  return [...totalsByRate].reduce(
    (total, [rate, spend]) => total + Math.floor((spend / 100) * Number(rate)),
    0,
  );
}

function getEligibleSubtotal(items, settings) {
  return items.reduce((sum, item) => {
    const rule = resolveEarningRule(item.product, settings);
    return (
      sum + (rule.enabled ? Number(item.price) * Number(item.quantity) : 0)
    );
  }, 0);
}

function resolveEarningRule(product, settings) {
  const productOverride = settings.productOverrides.find(
    (override) => override.productId === String(product._id ?? product.id),
  );
  if (productOverride) {
    return {
      enabled:
        productOverride.enabled !== false &&
        productOverride.pointsPerHundred > 0,
      pointsPerHundred: productOverride.pointsPerHundred,
    };
  }
  const categoryIds = [
    ...(Array.isArray(product.categories) ? product.categories : []),
    product.category,
  ]
    .filter(Boolean)
    .map(String);
  const categoryOverride = settings.categoryOverrides.find((override) =>
    categoryIds.includes(override.categoryId),
  );
  if (categoryOverride) {
    return {
      enabled:
        categoryOverride.enabled !== false &&
        categoryOverride.pointsPerHundred > 0,
      pointsPerHundred: categoryOverride.pointsPerHundred,
    };
  }
  return {
    enabled: settings.pointsPerHundred > 0,
    pointsPerHundred: settings.pointsPerHundred,
  };
}

function validateSettings(input) {
  const numeric = {
    pointsPerHundred: [input.pointsPerHundred, 0, 1_000_000],
    pointValue: [input.pointValue, 0.0001, 1_000_000],
    minimumRedemption: [input.minimumRedemption, 0, 1_000_000_000],
    maximumRedemptionPercent: [input.maximumRedemptionPercent, 0, 100],
    expirationDays: [input.expirationDays, 0, 36500],
  };
  const result = { enabled: input.enabled === true };
  for (const [key, [value, min, max]] of Object.entries(numeric)) {
    if (
      !Number.isFinite(Number(value)) ||
      Number(value) < min ||
      Number(value) > max
    ) {
      throw badRequest(`Invalid loyalty setting: ${key}`);
    }
    result[key] =
      key === "minimumRedemption" || key === "expirationDays"
        ? Math.trunc(Number(value))
        : Number(value);
  }
  result.productOverrides = validateOverrides(
    input.productOverrides,
    "productId",
  );
  result.categoryOverrides = validateOverrides(
    input.categoryOverrides,
    "categoryId",
  );
  return result;
}

function calculateRedemption(points, balance, eligibleSubtotal, settings) {
  const requested = Number(points);
  if (!Number.isSafeInteger(requested) || requested < 0) {
    throw badRequest("Redeemed points must be a non-negative whole number");
  }
  if (requested === 0) return { points: 0, discount: 0 };
  if (!settings.enabled)
    throw badRequest("Loyalty rewards are currently disabled");
  if (requested < settings.minimumRedemption) {
    throw badRequest(`Redeem at least ${settings.minimumRedemption} points`);
  }
  if (requested > balance) throw badRequest("Not enough available points");
  const maxPoints = Math.floor(
    (eligibleSubtotal * settings.maximumRedemptionPercent) /
      100 /
      settings.pointValue,
  );
  if (requested > maxPoints) {
    throw badRequest("Points exceed the maximum discount for this order");
  }
  return {
    points: requested,
    discount: roundMoney(requested * settings.pointValue),
  };
}

function calculateRefundPointTarget(points, ratio) {
  return ratio >= 1 ? Number(points) : Math.floor(Number(points) * ratio);
}

function validateOverrides(value, idField) {
  if (!Array.isArray(value) || value.length > 500) {
    throw badRequest(
      `${idField} overrides must be an array of at most 500 items`,
    );
  }
  const seen = new Set();
  return value.map((item) => {
    const key = String(item?.[idField] ?? "").trim();
    const pointsPerHundred = Number(item?.pointsPerHundred);
    if (
      !key ||
      key.length > 150 ||
      seen.has(key) ||
      !Number.isFinite(pointsPerHundred) ||
      pointsPerHundred < 0 ||
      pointsPerHundred > 1_000_000
    ) {
      throw badRequest(`Invalid or duplicate ${idField} override`);
    }
    seen.add(key);
    return {
      [idField]: key,
      pointsPerHundred,
      enabled: item.enabled !== false,
    };
  });
}

function validateIdempotencyKey(value) {
  const key = String(value ?? "").trim();
  if (!/^[\w:.-]{8,150}$/.test(key)) {
    throw badRequest("A valid idempotency key is required");
  }
  return key;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function badRequest(message) {
  return new BadRequestException({ success: false, message });
}

function notFound(message) {
  return new NotFoundException({ success: false, message });
}

Injectable()(LoyaltyService);
Inject(DATABASE)(LoyaltyService, undefined, 0);

export {
  DEFAULT_SETTINGS,
  calculateRedemption,
  calculateRefundPointTarget,
  estimateEarnedPoints,
  getEligibleSubtotal,
  resolveEarningRule,
  LoyaltyService,
  roundMoney,
  validateSettings,
};
