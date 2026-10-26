import { enqueueNotification } from "../notifications/notification-queue.js";

// Queue notifications in Redis so the order/payment request does not wait for
// a PostgreSQL write. Redis queue failures do not block the primary operation.
export async function createNotification({
  category = "system",
  title,
  description,
  link = "",
  order = null,
}) {
  try {
    return await enqueueNotification({
      category,
      title,
      description,
      link,
      order,
    });
  } catch (err) {
    console.error("createNotification failed:", err.message);
    return null;
  }
}

export async function createCustomerNotification({
  userId,
  category = "order",
  title,
  description,
  link = "/accounts",
  order = null,
}) {
  try {
    return await enqueueNotification({
      userId,
      category,
      title,
      description,
      link,
      order,
    });
  } catch (err) {
    console.error("createCustomerNotification failed:", err.message);
    return null;
  }
}
