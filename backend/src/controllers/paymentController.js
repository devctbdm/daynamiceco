import SSLCommerzPayment from "sslcommerz-lts";
import { sql } from "drizzle-orm";
import { getDatabase } from "../db/database.js";
import { paymentGateways } from "../db/schema.js";
import { findOrderById, findOrderByTranId } from "../orders/orders.service.js";
import { createNotification } from "../services/notificationService.js";
import { findUserById } from "../users/users.repository.js";

// @desc    Load SSLCommerz credentials from DB config, falling back to env
const getSSLCommerzConfig = async () => {
  const [gateway] = await getDatabase()
    .select({ document: paymentGateways.document })
    .from(paymentGateways)
    .where(sql`${paymentGateways.document}->>'name' = 'sslcommerz'`)
    .limit(1);
  const cfg = gateway?.document?.config || {};
  return {
    storeId: cfg.storeId || process.env.SSL_STORE_ID || "test6a71d90a75724",
    storePassword:
      cfg.storePassword ||
      process.env.SSL_STORE_PASSWORD ||
      "test6a71d90a75724@ssl",
    isLive:
      cfg.sandbox === undefined
        ? process.env.SSL_IS_LIVE === "true"
        : !cfg.sandbox,
  };
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
    const { orderId, amount, customer, advance } = req.body;
    const isAdvance = advance === true || advance === "true";

    if (!orderId || !amount || !customer) {
      return res.status(400).json({
        success: false,
        message: "orderId, amount and customer are required",
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

    const { storeId, storePassword, isLive } = await getSSLCommerzConfig();
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
        message:
          apiResponse.failedreason || "Payment gateway could not be reached",
        details: apiResponse,
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
    console.error("SSLCommerz Initiate Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Payment initiation failed",
    });
  }
};

// @desc    Validate and update an order after SSLCommerz redirect/query
// @route   GET/POST /api/payment/validate
// @access  Public (called by SSLCommerz redirect)
export const validatePayment = async (req, res) => {
  try {
    const body = req.body?.tran_id ? req.body : req.query;
    const { val_id, tran_id, status, amount } = body;

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

    const norm = (s) => (typeof s === "string" ? s.trim().toUpperCase() : "");
    const SUCCESS = ["VALID", "VALIDATED"];

    // The redirect outcome (the `status` SSLCommerz sends in its redirect,
    // or which result page the user landed on) is authoritative. In sandbox
    // the server-to-server validation call is flaky/timing-sensitive, so we
    // never let it downgrade a clearly successful redirect to "failed".
    const redirectStatus = norm(status);
    let outcome = null; // 'paid' | 'failed' | 'cancelled'
    if (SUCCESS.includes(redirectStatus)) outcome = "paid";
    else if (redirectStatus === "FAILED") outcome = "failed";
    else if (redirectStatus === "CANCELLED") outcome = "cancelled";

    // Supplement with the gateway validation only when present (non-throwing).
    let validation = null;
    if (val_id) {
      try {
        const { storeId, storePassword, isLive } = await getSSLCommerzConfig();
        const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);
        validation = await sslcz.validate({ val_id });
      } catch {
        validation = null;
      }
    }
    const gwStatus = norm(validation?.status);
    if (gwStatus && !outcome) {
      if (SUCCESS.includes(gwStatus)) outcome = "paid";
      else if (gwStatus === "FAILED") outcome = "failed";
      else if (gwStatus === "CANCELLED") outcome = "cancelled";
    }

    const isAdvance = tran_id.includes("_adv_");

    if (outcome === "paid") {
      if (isAdvance) {
        // Partial advance confirmation payment — do not mark the whole COD
        // order as paid; just record the amount against the order.
        order.advancePaid =
          Number(validation?.amount) || Number(amount) || order.advanceAmount;
        order.advanceReference = tran_id;
        settleAdvanceIfFullyPaid(order);
      } else {
        order.payment.status = "paid";
        order.payment.val_id = val_id || validation?.val_id || "";
        order.payment.card_type = validation?.card_type || "";
        order.payment.amount =
          Number(validation?.amount) || Number(amount) || order.payment.amount;
        order.payment.paidAt = order.payment.paidAt || new Date();
      }
    } else if (outcome === "cancelled") {
      if (!isAdvance) order.payment.status = "cancelled";
    } else {
      // failed (or unknown → failed, so it isn't stuck as pending)
      if (!isAdvance) order.payment.status = "failed";
    }
    await order.save();

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
      valid: outcome === "paid",
      advance: isAdvance,
      outcome,
      order: order._id,
    });
  } catch (error) {
    console.error("SSLCommerz Validate Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    SSLCommerz IPN listener (server-to-server)
// @route   POST /api/payment/ipn
// @access  Public (called by SSLCommerz)
export const ipnListener = async (req, res) => {
  try {
    const { status, tran_id, val_id, amount, card_type } = req.body;

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

    const norm = (s) => (typeof s === "string" ? s.trim().toUpperCase() : "");
    const SUCCESS = ["VALID", "VALIDATED"];
    const redirectStatus = norm(status);

    let success = SUCCESS.includes(redirectStatus);
    let validation = null;
    if (!success && val_id) {
      try {
        const { storeId, storePassword, isLive } = await getSSLCommerzConfig();
        const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);
        validation = await sslcz.validate({ val_id });
        success = SUCCESS.includes(norm(validation?.status));
      } catch {
        validation = null;
      }
    }

    if (success) {
      if (tran_id.includes("_adv_")) {
        order.advancePaid = amount ? Number(amount) : order.advanceAmount;
        order.advanceReference = tran_id;
        settleAdvanceIfFullyPaid(order);
      } else {
        order.payment.status = "paid";
        order.payment.val_id = val_id || "";
        order.payment.card_type = card_type || "";
        order.payment.amount = amount ? Number(amount) : order.payment.amount;
        order.payment.paidAt = order.payment.paidAt || new Date();
      }
    } else if (redirectStatus === "FAILED") {
      if (!tran_id.includes("_adv_")) order.payment.status = "failed";
    } else if (redirectStatus === "CANCELLED") {
      if (!tran_id.includes("_adv_")) order.payment.status = "cancelled";
    }
    await order.save();

    if (!wasPaid && order.payment.status === "paid") {
      await createNotification({
        category: "payment",
        title: "Payment confirmed",
        description: `Payment of ৳${order.payment.amount || order.totalAmount} for order ${order.orderNumber} is confirmed.`,
        link: `/admin/orders?id=${order._id}`,
        order: order._id,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("SSLCommerz IPN Error:", error);
    res.status(500).json({ success: false, message: error.message });
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

    const { storeId, storePassword, isLive } = await getSSLCommerzConfig();
    const sslcz = new SSLCommerzPayment(storeId, storePassword, isLive);

    const result = await sslcz.transactionQueryByTransactionId({ tran_id });
    const gatewayStatus = result?.status; // VALID / VALIDATED / FAILED / CANCELLED / UNATTEMPTED
    const isAdvance = tran_id.includes("_adv_");
    let updated = false;

    if (gatewayStatus === "VALID" || gatewayStatus === "VALIDATED") {
      if (isAdvance) {
        order.advancePaid = Number(result.amount) || order.advanceAmount;
        order.advanceReference = tran_id;
        settleAdvanceIfFullyPaid(order);
      } else {
        order.payment.status = "paid";
        order.payment.val_id = result.val_id || order.payment.val_id || "";
        order.payment.amount = Number(result.amount) || order.payment.amount;
        order.payment.paidAt = order.payment.paidAt || new Date();
      }
      updated = true;
    } else if (gatewayStatus === "FAILED") {
      if (!isAdvance && order.payment.status === "pending") {
        order.payment.status = "failed";
        updated = true;
      }
    } else if (gatewayStatus === "CANCELLED") {
      if (!isAdvance && order.payment.status === "pending") {
        order.payment.status = "cancelled";
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
    console.error("SSLCommerz Query Error:", error);
    res.status(500).json({ success: false, message: error.message });
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

    const order = await findOrderByTranId(tran_id);
    if (order && order.payment.status === "pending") {
      order.payment.status = "cancelled";
      await order.save();
    }

    res.json({ success: true, message: "Payment cancelled" });
  } catch (error) {
    console.error("SSLCommerz Cancel Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
