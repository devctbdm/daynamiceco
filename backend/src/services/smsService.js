import { getSmsSetting } from "../sms-settings/sms-settings.repository.js";
import { getStoreSettings } from "../store-settings/store-settings.repository.js";
import { createSmsLog } from "../sms-logs/sms-logs.repository.js";

const BULKSMS_BASE = "https://bulksmsbd.net/api";

function getRtcomUrl(setting, toList, message) {
  const url = new URL(setting.gatewayUrl);
  const keyVariable = setting.gatewayApiKeyVariable || "api_key";
  url.searchParams.set(keyVariable, setting.gatewayApiKey);
  url.searchParams.set("number", toList.join(","));
  url.searchParams.set("message", message);
  return url.toString();
}

// Normalize a BD number: 01712345678 -> 8801712345678, keeps 8801xxxxxxxxx as-is
function normalizeNumber(num) {
  let n = String(num).replace(/[^\d]/g, "");
  if (!n) return "";
  if (n.startsWith("880")) return n;
  if (n.startsWith("0") && n.length === 11) return `88${n}`;
  return n;
}

function parseNumbers(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map(normalizeNumber).filter(Boolean))];
  }
  return [
    ...new Set(
      String(input)
        .split(/[\s,;]+/)
        .map(normalizeNumber)
        .filter(Boolean),
    ),
  ];
}

async function getStore() {
  const s = await getStoreSettings();
  return {
    name: s?.storeName || "Apple IT Zone",
    phone: s?.phone || "",
  };
}

// Core send helper. Never throws — returns a result object so callers
// (order flow, auth flow, admin controller) never break on SMS failures.
export async function sendSms({ numbers, message, senderId, skipSignature }) {
  const result = {
    success: false,
    skipped: false,
    reason: "",
    log: null,
    numbers: [],
  };

  const setting = await getSmsSetting();
  const isRtcom = setting.provider === "rtcom";
  const configuredApiKey = isRtcom ? setting.gatewayApiKey : setting.apiKey;
  if (!configuredApiKey) {
    result.skipped = true;
    result.reason = "SMS API key is not configured";
    return result;
  }
  if (isRtcom && !setting.gatewayUrl) {
    result.skipped = true;
    result.reason = "SMS gateway URL is not configured";
    return result;
  }
  if (!setting.enabled) {
    result.skipped = true;
    result.reason = "SMS sending is disabled";
    return result;
  }

  const toList = parseNumbers(numbers);
  if (toList.length === 0) {
    result.reason = "No valid Bangladesh phone numbers provided";
    return result;
  }

  const useSender =
    (senderId && String(senderId).trim()) || setting.senderId || "";
  const fullMessage =
    !skipSignature && setting.signature
      ? `${String(message).trim()}\n${setting.signature}`
      : String(message).trim();

  try {
    const request = isRtcom
      ? {
          url: getRtcomUrl(setting, toList, fullMessage),
          options: { method: "GET" },
        }
      : (() => {
          const body = new URLSearchParams();
          body.append("api_key", setting.apiKey);
          if (useSender) body.append("senderid", useSender);
          body.append("number", toList.join(","));
          body.append("message", fullMessage);
          return {
            url: `${BULKSMS_BASE}/smsapi`,
            options: {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: body.toString(),
            },
          };
        })();
    const resp = await fetch(request.url, request.options);
    const data = await resp.json();

    const responseCode = data?.response_code ?? data?.status_code ?? null;
    const sent =
      String(responseCode) === "202" ||
      data.status === "SMS_SENT" ||
      data.status === "SUCCESS" ||
      (typeof responseCode === "number" &&
        responseCode >= 200 &&
        responseCode < 300);

    const log = await createSmsLog({
      to: toList,
      message: fullMessage,
      segments: Math.max(1, Math.ceil(fullMessage.length / 160)),
      status: sent ? "sent" : "failed",
      providerStatus: String(responseCode ?? data.status ?? ""),
      providerMessage:
        data.success_message || data.error_message || data.message || "",
      errorCode: String(responseCode ?? ""),
      raw: data,
    });

    return { ...result, success: sent, log, numbers: toList };
  } catch (error) {
    return { ...result, reason: error.message };
  }
}

const orderId = (order) =>
  `ORD-${order._id.toString().slice(-5).toUpperCase()}`;

// Customer order placed confirmation
export async function notifyOrderPlaced({ order, name, phone }) {
  const store = await getStore();
  const message =
    `Hello ${name}, your order ${orderId(order)} at ${store.name} has been confirmed. ` +
    `Total: ৳${order.totalAmount}. We will call you soon for delivery.`;
  return sendSms({ numbers: phone, message });
}

// Customer order cancelled
export async function notifyOrderCancelled({ order, name, phone }) {
  const store = await getStore();
  const refund =
    order.payment?.status === "paid" ? " Your refund is being processed." : "";
  const message =
    `Hello ${name}, your order ${orderId(order)} at ${store.name} has been cancelled.${refund} ` +
    (store.phone
      ? `Contact us at ${store.phone} if you have any questions.`
      : "Contact us for any questions.");
  return sendSms({ numbers: phone, message });
}

// Password reset OTP
export async function sendPasswordResetOtp({ phone, otp }) {
  const store = await getStore();
  const message =
    `${store.name} password reset code: ${otp}. ` +
    `Valid for 10 minutes. Do not share this code with anyone.`;
  return sendSms({ numbers: phone, message });
}

// Admin login 2FA OTP
export async function sendLoginOtp({ phone, otp, expirySeconds = 60 }) {
  const store = await getStore();
  const message =
    `${store.name} login verification code: ${otp}. ` +
    `Valid for ${expirySeconds} seconds. Do not share this code with anyone.`;
  return sendSms({ numbers: phone, message });
}

// Order-status notification templates. `{name}`, `{oid}`, `{store}` and
// `{total}` are filled from the order data. Keep them short to fit one SMS.
const STATUS_TEMPLATES = {
  pending: (d) =>
    `Hello ${d.name}, your order ${d.oid} from ${d.store} is currently pending. ` +
    `Total: ৳${Number(d.total).toLocaleString()}. We’ll update you shortly. Thank you! ❤️`,
  processing: (d) =>
    `Hello ${d.name}, your order ${d.oid} from ${d.store} is now processing. ` +
    `Total: ৳${Number(d.total).toLocaleString()}. We’re preparing your order. ❤️`,
  confirmed: (d) =>
    `Hello ${d.name}, your order ${d.oid} from ${d.store} is confirmed! 🎉 ` +
    `Total: ৳${Number(d.total).toLocaleString()}. Thank you for shopping with us. ❤️`,
  send_courier: (d) =>
    `Hello ${d.name}, your order ${d.oid} from ${d.store} has been sent to the courier. ` +
    `📦 Your order is on its way!`,
  cancelled: (d) =>
    `Hello ${d.name}, your order ${d.oid} from ${d.store} has been cancelled. ` +
    `If you have any questions, please contact us. Thank you.`,
};

export function getOrderStatusMessage(
  status,
  { name, orderId, storeName, total },
) {
  const tpl = STATUS_TEMPLATES[status];
  if (!tpl) return "";
  return tpl({
    name,
    oid: orderId,
    store: storeName,
    total: Number(total) || 0,
  });
}

// Send the order-status SMS for a given status change. `order.orderNumber`
// is rendered as `#123`; falls back to `ORD-XXXXX` when missing.
export async function notifyOrderStatusChange({ order, status, name, phone }) {
  const store = await getStore();
  const raw = order.orderNumber || orderId(order);
  const oid = `#${String(raw).replace(/^#/, "")}`;
  const message = getOrderStatusMessage(status, {
    name: name || "Customer",
    orderId: oid,
    storeName: store.name,
    total: order.totalAmount,
  });
  if (!message) {
    return { success: false, skipped: true, reason: "No template for status" };
  }
  return sendSms({
    numbers: phone,
    message,
    // Every order-status template already includes "from [Store Name]", so
    // skip the store signature to avoid repeating the store name.
    skipSignature: true,
  });
}
