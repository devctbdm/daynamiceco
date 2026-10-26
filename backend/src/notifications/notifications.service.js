import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DATABASE } from "../db/database.js";
import { emitToCustomer } from "../socket.js";
import {
  countUnreadNotifications,
  createNotificationCampaign,
  deleteNotificationCampaign,
  listNotificationCampaigns,
  listNotificationEntries,
  listCustomerNotificationEntries,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationCampaign,
} from "./notifications.repository.js";

const CAMPAIGN_CATEGORIES = new Set([
  "order",
  "delivery",
  "rider",
  "payment",
  "system",
]);

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

  async getCustomerNotifications(userId, query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const read =
      query.read === "true" ? true : query.read === "false" ? false : undefined;
    const { notifications, total, unreadCount } =
      await listCustomerNotificationEntries(
        userId,
        { page, limit, read },
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

  async markCustomerRead(id, userId) {
    const notification = await markNotificationRead(id, this.database, userId);
    if (!notification) {
      throw new NotFoundException({
        success: false,
        message: "Notification not found",
      });
    }
    return { success: true, notification };
  }

  async markAllCustomerRead(userId) {
    await markAllNotificationsRead(this.database, userId);
    return { success: true, message: "All notifications marked as read" };
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

  async getCampaigns(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const { campaigns, total } = await listNotificationCampaigns(
      { page, limit },
      this.database,
    );
    return {
      success: true,
      campaigns,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async createCampaign(input = {}) {
    const data = normalizeCampaign(input);
    const { campaign, recipientIds } = await createNotificationCampaign(
      data,
      this.database,
    );
    notifyCustomers(campaign.id, recipientIds);
    return {
      success: true,
      campaign: { ...campaign, _id: campaign.id, readCount: 0 },
    };
  }

  async updateCampaign(id, input = {}) {
    const result = await updateNotificationCampaign(
      id,
      normalizeCampaign(input),
      this.database,
    );
    if (!result) {
      throw new NotFoundException({
        success: false,
        message: "Notification campaign not found",
      });
    }
    const { campaign, recipientIds } = result;
    notifyCustomers(campaign.id, recipientIds);
    return { success: true, campaign: { ...campaign, _id: campaign.id } };
  }

  async deleteCampaign(id) {
    const deleted = await deleteNotificationCampaign(id, this.database);
    if (!deleted) {
      throw new NotFoundException({
        success: false,
        message: "Notification campaign not found",
      });
    }
    return { success: true, message: "Notification campaign deleted" };
  }
}

function normalizeCampaign(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new BadRequestException("Announcement details are required");
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const category = input.category || "system";
  const link = typeof input.link === "string" ? input.link.trim() : "";

  if (!title || title.length > 120) {
    throw new BadRequestException(
      "Title is required and must be 120 characters or fewer",
    );
  }
  if (!description || description.length > 2000) {
    throw new BadRequestException(
      "Message is required and must be 2000 characters or fewer",
    );
  }
  if (!CAMPAIGN_CATEGORIES.has(category)) {
    throw new BadRequestException("Unsupported notification category");
  }
  if (link.length > 2048) {
    throw new BadRequestException("Link must be 2048 characters or fewer");
  }
  if (
    link &&
    !(
      (link.startsWith("/") && !link.startsWith("//")) ||
      /^https?:\/\/\S+$/i.test(link)
    )
  ) {
    throw new BadRequestException(
      "Link must be a relative path or an HTTP(S) URL",
    );
  }
  return { title, description, category, link };
}

function notifyCustomers(campaignId, recipientIds) {
  for (const userId of recipientIds) {
    try {
      emitToCustomer(userId, "notification:new", { campaignId });
    } catch (error) {
      console.error(
        "Failed to emit customer notification refresh:",
        error.message,
      );
      break;
    }
  }
}

Injectable()(NotificationsService);
Inject(DATABASE)(NotificationsService, undefined, 0);

export { NotificationsService };
