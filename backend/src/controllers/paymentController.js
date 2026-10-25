import { sql } from "drizzle-orm";
import SSLCommerzPayment from "sslcommerz-lts";
import { getDatabase } from "../db/database.js";
import { paymentGateways } from "../db/schema.js";
import { findOrderById, findOrderByTranId } from "../orders/orders.service.js";
import { getSSLCommerzConfig } from "../payments/sslcommerz-config.js";
import {
  isSuccessfulPaymentStatus,
  isSuccessfulPaymentValidation,
} from "../payments/payment-verification.js";
import { createNotification } from "../services/notificationService.js";
import { findUserById } from "../users/users.repository.js";

const isSSLCommerzEnabled = async () => {
  const [gateway] = await getDatabase()
    .select({ document: paymentGateways.document })
    .from(paymentGateways)
    .where(sql`${paymentGateways.document}->>'name' = 'sslcommerz'`)
    .limit(1);
  return gateway?.document?.enabled !== false;
};

const getExpectedPaymentAmount = (order, isAdvance, tranId) => {
  const referencedAdvanceAmount = Number(order.payment?.advanceReferenceAmount);
  if (
    isAdvance &&
    order.advanceReference === tranId &&
    Number.isFinite(referencedAdvanceAmount) &&
    referencedAdvanceAmount > 0
  ) {
    return referencedAdvanceAmount;
  }

  const configuredAmount = Number(order.payment?.amount);
  if (Number.isFinite(configuredAmount) && configuredAmount > 0) {
    return configuredAmount;
  }
  return isAdvance
    ? Math.max(0, Number(order.advanceAmount) - Number(order.advancePaid))
    : Number(order.totalAmount);
};

const validateGatewayTransaction = async (tranId, valId, order) => {
  if (!valId) return null;
  const { storeId, storePassword, isLive } = getSSLCommerzConfig();
  const gateway = new SSLCommerzPayment(storeId, storePassword, isLive);
  const validation = await gateway.validate({ val_id: valId });
  const isAdvance = tranId.includes("_adv_");
  const expectedAmount = getExpectedPaymentAmount(order, isAdvance, tranId);
  return isSuccessfulPaymentValidation(validation, {
    tranId,
    expectedAmount,
  })
    ? validation
    : null;
};

// When the confirmed advance fully covers the order total, the COD order is
// effectively paid in full — mark the payment as paid and record the amount.
const settleAdvanceIfFullyPaid = (order) => {
  if (Number(order.advancePaid) >= Number(order.totalAmount)) {
    order.payment.status = "paid";
    order.payment.amount = Number(order.advancePaid) || order.payment.amount;
    order.payment.paidAt = order.payment.paidAt || new Date();
  }
};

// @desc    Initiate SSLCommerz payment for an order
// @route   POST /api/payment/initiate
// @access  Private
export const initiatePayment = async (req, res) => {
  try {
    const { orderId, customer, advance } = req.body;
    const isAdvance = advance === true || advance === "true";

    if (!orderId || !customer) {
      return res.status(400).json({
        success: false,
        message: "orderId and customer are required",
      });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    if (order.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }
    if (!(await isSSLCommerzEnabled())) {
      return res
        .status(503)
        .json({ success: false, message: "Online payments are unavailable" });
    }
    if (isAdvance) {
      if (order.payment.status === "paid") {
        return res
          .status(400)
          .json({ success: false, message: "Order is already paid" });
      }
      if (order.advancePaid >= order.advanceAmount && order.advanceAmount > 0) {
        return res
          .status(400)
          .json({ success: false, message: "Advance already paid" });
      }
    } else if (order.payment.status === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Order is already paid" });
    }
    const amount = isAdvance
      ? Math.max(0, Number(order.advanceAmount) - Number(order.advancePaid))
      : Number(order.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order has no payable balance",
      });
    }

    const tran_id = isAdvance
      ? `${order._id}_adv_${Date.now()}`
      : `${order._id}_${Date.now()}`;

    // Build reliable customer details: request body -> order shipping address
    // -> buyer's account record. Empty gateway fields show up as "N/A" in the
    // SSLCommerz dashboard, so we never send blank values when a fallback exists.
    const buyer = await findUserById(order.user);
    const addr = order.shippingAddress || {};
    const firstNonEmpty = (...vals) =>
      vals.map((v) => (typeof v === "string" ? v.trim() : v)).find(Boolean) ||
      "";
    const cusName =
      firstNonEmpty(customer.name, addr.fullName, buyer?.name) || "Customer";
    const cusEmail = firstNonEmpty(customer.email, buyer?.email);
    const cusPhone = firstNonEmpty(customer.phone, addr.phone, buyer?.phone);
    const cusAdd1 = firstNonEmpty(customer.address, addr.street);
    const cusCity = firstNonEmpty(customer.city, addr.city);
    const cusState = firstNonEmpty(customer.state, addr.state);
    const cusPostcode = firstNonEmpty(customer.postcode, addr.postcode, "1207");
    const cusCountry = firstNonEmpty(
      customer.country,
      addr.country,
      "Bangladesh",
    );

    const { storeId, storePassword, isLive } = getSSLCommerzConfig();
    const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);

    const data = {
      total_amount: Number(amount),
      currency: "BDT",
      tran_id,
      success_url: `${process.env.FRONTEND_URL}/payment/success?tran_id=${tran_id}`,
      fail_url: `${process.env.FRONTEND_URL}/payment/fail?tran_id=${tran_id}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?tran_id=${tran_id}`,
      ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn?tran_id=${tran_id}`,
      product_name: isAdvance
        ? "Apple IT Zone Order (Advance)"
        : "Apple IT Zone Order",
      product_category: "Electronics",
      product_profile: "general",
      shipping_method: "COURIER",
      num_of_item: order.items.length,
      ship_name: cusName,
      ship_add1: cusAdd1,
      ship_city: cusCity,
      ship_state: cusState,
      ship_postcode: cusPostcode,
      ship_country: cusCountry,
      cus_name: cusName,
      cus_email: cusEmail || "noreply@appleitzone.com",
      cus_phone: cusPhone || "01700000000",
      cus_add1: cusAdd1,
      cus_add2: "",
      cus_city: cusCity,
      cus_state: cusState,
      cus_postcode: cusPostcode,
      cus_country: cusCountry,
      value_a: order._id.toString(),
      value_b: isAdvance ? "advance" : "full",
    };

    const apiResponse = await sslcz.init(data);

    if (apiResponse.status !== "SUCCESS" || !apiResponse.GatewayPageURL) {
      return res.status(400).json({
        success: false,
        message: "Payment gateway could not initiate the transaction",
      });
    }

    order.payment.tran_id = tran_id;
    order.payment.amount = Number(amount);
    await order.save();

    res.json({
      success: true,
      gatewayUrl: apiResponse.GatewayPageURL,
      tran_id,
      advance: isAdvance,
    });
  } catch (error) {
    console.error("SSLCommerz initiation failed:", error?.name || "Error");
    res.status(500).json({
      success: false,
      message: "Payment initiation failed",
    });
  }
};

// @desc    Validate and update an order after SSLCommerz redirect/query
// @route   GET/POST /api/payment/validate
// @access  Public (called by SSLCommerz redirect)
export const validatePayment = async (req, res) => {
  try {
    const body = req.body?.tran_id ? req.body : req.query;
    const { val_id, tran_id } = body;

    if (!tran_id) {
      return res
        .status(400)
        .json({ success: false, message: "tran_id is required" });
    }

    const order = await findOrderByTranId(tran_id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const wasPaid = order.payment.status === "paid";
    const isAdvance = tran_id.includes("_adv_");
    const validation = await validateGatewayTransaction(tran_id, val_id, order);
    if (!validation) {
      return res.status(422).json({
        success: false,
        valid: false,
        message: "Payment could not be verified",
      });
    }

    let updated = false;
    if (isAdvance) {
      if (order.advanceReference !== tran_id && !wasPaid) {
        order.advancePaid =
          Number(order.advancePaid) + Number(validation.amount);
        order.advanceReference = tran_id;
        order.payment.advanceReferenceAmount = Number(validation.amount);
        settleAdvanceIfFullyPaid(order);
        updated = true;
      }
    } else if (!wasPaid) {
      order.payment.status = "paid";
      order.payment.val_id = validation.val_id || val_id;
      order.payment.card_type = validation.card_type || "";
      order.payment.amount = Number(validation.amount);
      order.payment.paidAt = new Date();
      updated = true;
    }
    if (updated) await order.save();

    if (!wasPaid && order.payment.status === "paid") {
      await createNotification({
        category: "payment",
        title: "Payment confirmed",
        description: `Payment of ৳${order.payment.amount || order.totalAmount} for order ${order.orderNumber} is confirmed.`,
        link: `/admin/orders?id=${order._id}`,
        order: order._id,
      });
    }

    res.json({
      success: true,
      valid: true,
      advance: isAdvance,
      order: order._id,
    });
  } catch (error) {
    console.error("SSLCommerz validation failed:", error?.name || "Error");
    res.status(502).json({
      success: false,
      valid: false,
      message: "Payment verification is temporarily unavailable",
    });
  }
};

// @desc    SSLCommerz IPN listener (server-to-server)
// @route   POST /api/payment/ipn
// @access  Public (called by SSLCommerz)
export const ipnListener = async (req, res) => {
  try {
    const { tran_id, val_id } = req.body;

    if (!tran_id) {
      return res
        .status(400)
        .json({ success: false, message: "tran_id is required" });
    }

    const order = await findOrderByTranId(tran_id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const wasPaid = order.payment.status === "paid";
    const validation = await validateGatewayTransaction(tran_id, val_id, order);
    if (!validation) {
      return res.status(422).json({
        success: false,
        message: "Payment could not be verified",
      });
    }

    let updated = false;
    if (tran_id.includes("_adv_")) {
      if (order.advanceReference !== tran_id && !wasPaid) {
        order.advancePaid =
          Number(order.advancePaid) + Number(validation.amount);
        order.advanceReference = tran_id;
        order.payment.advanceReferenceAmount = Number(validation.amount);
        settleAdvanceIfFullyPaid(order);
        updated = true;
      }
    } else if (!wasPaid) {
      order.payment.status = "paid";
      order.payment.val_id = validation.val_id || val_id;
      order.payment.card_type = validation.card_type || "";
      order.payment.amount = Number(validation.amount);
      order.payment.paidAt = new Date();
      updated = true;
    }
    if (updated) await order.save();

    if (!wasPaid && order.payment.status === "paid") {
      await createNotification({
        category: "payment",
        title: "Payment confirmed",
        description: `Payment of ৳${order.payment.amount || order.totalAmount} for order ${order.orderNumber} is confirmed.`,
        link: `/admin/orders?id=${order._id}`,
        order: order._id,
      });
    }

    res.status(200).json({ success: true, valid: true });
  } catch (error) {
    console.error("SSLCommerz IPN validation failed:", error?.name || "Error");
    res.status(502).json({
      success: false,
      message: "Payment verification is temporarily unavailable",
    });
  }
};

// @desc    Query the real transaction status from SSLCommerz by tran_id and
//          sync it onto the order. Used by the admin "refresh from gateway".
// @route   GET /api/payment/transaction/:tran_id
// @access  Admin
export const queryTransaction = async (req, res) => {
  try {
    const { tran_id } = req.params;
    if (!tran_id) {
      return res
        .status(400)
        .json({ success: false, message: "tran_id is required" });
    }

    const order = await findOrderByTranId(tran_id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const wasPaid = order.payment.status === "paid";

    const { storeId, storePassword, isLive } = getSSLCommerzConfig();
    const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);

    const result = await sslcz.transactionQueryByTransactionId({ tran_id });
    const gatewayStatus = result?.status; // VALID / VALIDATED / FAILED / CANCELLED / UNATTEMPTED
    const isAdvance = tran_id.includes("_adv_");
    const isValid = isSuccessfulPaymentValidation(result, {
      tranId: tran_id,
      expectedAmount: getExpectedPaymentAmount(order, isAdvance, tran_id),
    });
    let updated = false;

    if (isSuccessfulPaymentStatus(gatewayStatus) && isValid) {
      if (isAdvance && order.advanceReference !== tran_id && !wasPaid) {
        order.advancePaid = Number(order.advancePaid) + Number(result.amount);
        order.advanceReference = tran_id;
        order.payment.advanceReferenceAmount = Number(result.amount);
        settleAdvanceIfFullyPaid(order);
        updated = true;
      } else if (!isAdvance && !wasPaid) {
        order.payment.status = "paid";
        order.payment.val_id = result.val_id || order.payment.val_id || "";
        order.payment.amount = Number(result.amount);
        order.payment.paidAt = new Date();
        updated = true;
      }
    }

    if (updated) await order.save();

    if (!wasPaid && order.payment.status === "paid") {
      await createNotification({
        category: "payment",
        title: "Payment confirmed",
        description: `Payment of ৳${order.payment.amount || order.totalAmount} for order ${order.orderNumber} is confirmed.`,
        link: `/admin/orders?id=${order._id}`,
        order: order._id,
      });
    }

    res.json({
      success: true,
      gatewayStatus,
      paymentStatus: order.payment.status,
      advancePaid: order.advancePaid,
      updated,
      order: order._id,
    });
  } catch (error) {
    console.error(
      "SSLCommerz transaction query failed:",
      error?.name || "Error",
    );
    res.status(502).json({
      success: false,
      message: "Payment status could not be retrieved",
    });
  }
};

// @desc    Mark an order's payment as cancelled
// @route   GET/POST /api/payment/cancel
// @access  Public (called by SSLCommerz redirect)
export const cancelPayment = async (req, res) => {
  try {
    const { tran_id } = req.body?.tran_id ? req.body : req.query;

    if (!tran_id) {
      return res
        .status(400)
        .json({ success: false, message: "tran_id is required" });
    }

    res.json({
      success: true,
      message:
        "Cancellation received; payment status will be verified by the gateway",
    });
  } catch (error) {
    console.error("SSLCommerz cancellation failed:", error?.name || "Error");
    res.status(500).json({ success: false, message: "Cancellation failed" });
  }
};
