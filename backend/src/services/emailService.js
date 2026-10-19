// backend/src/services/emailService.js
// Transactional email via Resend. Follows the smsService pattern: never
// throws, returns a result object so order/auth flows never break on failure.
//
// Free testing (no verified domain):
//   - "from" must be onboarding@resend.dev (Resend's free test sender)
//   - Resend only delivers to YOUR OWN account email address until you verify
//     a domain. Other recipients get a 403 validation error.
// Production:
//   - Verify your domain at resend.com/domains, then set e.g.
//     RESEND_FROM="Apple IT Zone <no-reply@appleitzone.com>"
import { Resend } from "resend";
import { getStoreSettings } from "../store-settings/store-settings.repository.js";

const FROM = process.env.RESEND_FROM || "Apple IT Zone <onboarding@resend.dev>";

let client = null;
const getClient = () => {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
};

export const isEmailEnabled = () =>
  process.env.EMAIL_ENABLED !== "false" && !!process.env.RESEND_API_KEY;

async function getStore() {
  const s = await getStoreSettings();
  return {
    name: s?.storeName || "Apple IT Zone",
    phone: s?.phone || "",
    email: s?.email || "",
    url: process.env.FRONTEND_URL || "http://localhost:3000",
  };
}

/**
 * Core send helper.
 * @returns {{success:boolean, skipped:boolean, id:string|null, reason:string}}
 */
export async function sendEmail({ to, subject, html }) {
  const result = { success: false, skipped: false, id: null, reason: "" };

  if (!process.env.RESEND_API_KEY) {
    result.skipped = true;
    result.reason = "RESEND_API_KEY is not configured";
    console.warn("[email] skipped:", result.reason);
    return result;
  }
  if (process.env.EMAIL_ENABLED === "false") {
    result.skipped = true;
    result.reason = "Email sending is disabled";
    return result;
  }
  if (!to) {
    result.skipped = true;
    result.reason = "No recipient email address provided";
    return result;
  }

  const resend = getClient();
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (error) {
      result.reason = error.message || "Resend API error";
      console.error("[email] Resend error:", error);
    } else {
      result.success = true;
      result.id = data?.id || null;
      console.log(`[email] sent to ${to} (id: ${result.id})`);
    }
  } catch (err) {
    result.reason = err.message || "Email send failed";
    console.error("[email] send failed:", err.message);
  }
  return result;
}

// ---------- Templates ----------

const money = (n) => `৳${Number(n || 0).toLocaleString("en-US")}`;

const escapeHtml = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Shared page shell — dark header, content card, light footer. */
function layout({ storeName, storeUrl, title, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#111827;border-radius:10px 10px 0 0;padding:20px 32px;text-align:center;">
              <a href="${storeUrl}" style="color:#ffffff;font-size:20px;font-weight:700;text-decoration:none;letter-spacing:.5px;">${escapeHtml(storeName)}</a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none;padding:18px 32px;text-align:center;font-size:12px;color:#6b7280;">
              Questions? Contact us at ${escapeHtml(storeName)} support.<br/>
              © ${new Date().getFullYear()} ${escapeHtml(storeName)}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Compact line-item table shared by all order-related templates. */
function itemsTableHtml(order) {
  return (order.items || [])
    .map(
      (it) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${
                  it.image
                    ? `<td width="56" valign="top"><img src="${it.image}" alt="${escapeHtml(it.name)}" width="48" height="48" style="border-radius:6px;border:1px solid #e5e7eb;object-fit:cover;display:block;" /></td>`
                    : ""
                }
                <td valign="top" style="padding-left:12px;">
                  <div style="font-weight:600;font-size:14px;">${escapeHtml(it.name)}</div>
                  <div style="font-size:13px;color:#6b7280;margin-top:2px;">Qty: ${it.quantity} × ${money(it.price)}</div>
                </td>
                <td valign="top" align="right" style="font-weight:600;font-size:14px;white-space:nowrap;">${money(it.quantity * it.price)}</td>
              </tr>
            </table>
          </td>
        </tr>`,
    )
    .join("");
}

/** Order confirmation — sent right after checkout. */
export function orderConfirmationTemplate({
  order,
  name,
  storeName,
  storeUrl,
}) {
  const rows = itemsTableHtml(order);

  const discountRow =
    order.coupon?.discount > 0
      ? `<tr>
           <td style="padding:4px 0;font-size:14px;color:#059669;">Discount (${escapeHtml(order.coupon.code)})</td>
           <td align="right" style="padding:4px 0;font-size:14px;color:#059669;">−${money(order.coupon.discount)}</td>
         </tr>`
      : "";

  const a = order.shippingAddress || {};
  const addressLines = [a.street, a.city, a.state, a.postcode, a.country]
    .filter(Boolean)
    .join(", ");

  return layout({
    storeName,
    storeUrl,
    title: `Order confirmation — ${order.orderNumber}`,
    body: `
      <h2 style="margin:0 0 4px;font-size:22px;">Thank you for your order, ${escapeHtml(name)}! 🎉</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
        We've received your order <strong>#${escapeHtml(order.orderNumber)}</strong> and will start processing it shortly.
      </p>

      <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;">Order summary</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
        ${discountRow}
        <tr>
          <td style="padding:8px 0;font-size:15px;font-weight:700;">Total</td>
          <td align="right" style="padding:8px 0;font-size:15px;font-weight:700;">${money(order.totalAmount)}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;">Delivery address</p>
          <p style="margin:0;font-size:14px;line-height:1.6;">${escapeHtml(addressLines || "—")}</p>
          <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
            Payment method: <strong>${escapeHtml(order.payment?.method === "sslcommerz" ? "Online payment" : "Cash on delivery")}</strong>
            · Status: <strong>${escapeHtml(order.orderStatus || "pending")}</strong>
          </p>
        </td></tr>
      </table>

      <div style="text-align:center;margin-top:28px;">
        <a href="${storeUrl}/accounts" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Track your order</a>
      </div>

      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
        If you didn't place this order, you can safely ignore this email.
      </p>
    `,
  });
}

// ---------- Flow helpers (fire-and-forget safe) ----------

export async function notifyOrderConfirmation({ order, name, email }) {
  const store = await getStore();
  return sendEmail({
    to: email,
    subject: `Order confirmed — #${order.orderNumber} | ${store.name}`,
    html: orderConfirmationTemplate({
      order,
      name,
      storeName: store.name,
      storeUrl: store.url,
    }),
  });
}

/** Per-status headline/description for the status-change email. */
const EMAIL_STATUS_META = {
  pending: {
    label: "Order pending",
    icon: "⏳",
    color: "#d97706",
    desc: "We've received your order and it's waiting to be processed. We'll keep you updated.",
  },
  processing: {
    label: "Order processing",
    icon: "🛠️",
    color: "#2563eb",
    desc: "Good news! Your order is being prepared right now.",
  },
  confirmed: {
    label: "Order confirmed",
    icon: "✅",
    color: "#059669",
    desc: "Your order is confirmed and scheduled for packing. Thank you for shopping with us!",
  },
  send_courier: {
    label: "Shipped via courier",
    icon: "📦",
    color: "#7c3aed",
    desc: "Your parcel has been handed to the courier and is on its way to your address.",
  },
  cancelled: {
    label: "Order cancelled",
    icon: "❌",
    color: "#dc2626",
    desc: "Your order has been cancelled. Any paid amount will be refunded. Contact us if you have questions.",
  },
};

/** Order status update — mirrors the SMS status templates. */
export function orderStatusUpdateTemplate({
  order,
  name,
  status,
  storeName,
  storeUrl,
}) {
  const meta = EMAIL_STATUS_META[status] || EMAIL_STATUS_META.pending;
  const rows = itemsTableHtml(order);

  return layout({
    storeName,
    storeUrl,
    title: `${meta.label} — #${order.orderNumber}`,
    body: `
      <div style="text-align:center;padding:8px 0 4px;">
        <div style="font-size:40px;line-height:1;">${meta.icon}</div>
        <h2 style="margin:10px 0 6px;font-size:22px;color:${meta.color};">${meta.label}</h2>
        <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(meta.desc)}</p>
      </div>

      <p style="margin:20px 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;">Hello ${escapeHtml(name)}, here's your order</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
        ${
          order.coupon?.discount > 0
            ? `<tr>
                 <td style="padding:4px 0;font-size:14px;color:#059669;">Discount (${escapeHtml(order.coupon.code)})</td>
                 <td align="right" style="padding:4px 0;font-size:14px;color:#059669;">−${money(order.coupon.discount)}</td>
               </tr>`
            : ""
        }
        <tr>
          <td style="padding:8px 0;font-size:15px;font-weight:700;">Total</td>
          <td align="right" style="padding:8px 0;font-size:15px;font-weight:700;">${money(order.totalAmount)}</td>
        </tr>
      </table>

      <div style="text-align:center;margin-top:28px;">
        <a href="${storeUrl}/accounts" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">View order details</a>
      </div>
    `,
  });
}

export async function notifyOrderStatusEmail({ order, name, email, status }) {
  const store = await getStore();
  return sendEmail({
    to: email,
    subject: `${EMAIL_STATUS_META[status]?.label || "Order update"} — #${order.orderNumber} | ${store.name}`,
    html: orderStatusUpdateTemplate({
      order,
      name,
      status,
      storeName: store.name,
      storeUrl: store.url,
    }),
  });
}
