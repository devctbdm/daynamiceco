import { createNotificationEntry } from "../notifications/notifications.repository.js";
import { emitToAdmins } from "../socket.js";

// Persist a notification and push it to every connected admin client in
// real time. Notification failures do not block the order/payment request.
export async function createNotification({
  category = "system",
  title,
  description,
  link = "",
  order = null,
}) {
  try {
    const doc = await createNotificationEntry({
      category,
      title,
      description,
      link,
      order,
    });

    emitToAdmins("notification:new", {
      _id: doc._id,
      category: doc.category,
      title: doc.title,
      description: doc.description,
      link: doc.link,
      read: doc.read,
      createdAt: doc.createdAt,
    });

    return doc;
  } catch (err) {
    console.error("createNotification failed:", err.message);
    return null;
  }
}
