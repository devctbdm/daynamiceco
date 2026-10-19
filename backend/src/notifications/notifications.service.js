import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DATABASE } from "../db/database.js";
import {
  countUnreadNotifications,
  listNotificationEntries,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.repository.js";

class NotificationsService {
  constructor(database) {
    this.database = database;
  }

  async getNotifications(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const read =
      query.read === "true" ? true : query.read === "false" ? false : undefined;
    const { notifications, total, unreadCount } = await listNotificationEntries(
      { page, limit, read, category: query.category },
      this.database,
    );
    return {
      success: true,
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getUnreadCount() {
    return {
      success: true,
      unreadCount: await countUnreadNotifications(this.database),
    };
  }

  async markRead(id) {
    const notification = await markNotificationRead(id, this.database);
    if (!notification) {
      throw new NotFoundException({
        success: false,
        message: "Notification not found",
      });
    }
    return { success: true, notification };
  }

  async markAllRead() {
    await markAllNotificationsRead(this.database);
    return { success: true, message: "All notifications marked as read" };
  }
}

Injectable()(NotificationsService);
Inject(DATABASE)(NotificationsService, undefined, 0);

export { NotificationsService };
