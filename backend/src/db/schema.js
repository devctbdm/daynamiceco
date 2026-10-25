import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { shoppingCartItems, shoppingCarts } from "../models/Cart.js";
import { categoryEntries } from "../models/Category.js";
import { sequenceCounters } from "../models/Counter.js";
import { holidaySettings } from "../models/HolidayConfig.js";
import { homePageContent } from "../models/HomeContent.js";
import { homeSliderSettings } from "../models/HomeSliderSetting.js";
import { homeSliderTextEntries } from "../models/HomeSliderText.js";
import { maintenanceSetting } from "../models/MaintenanceSetting.js";
import { notificationEntries } from "../models/Notification.js";
import { offerEntries } from "../models/Offer.js";
import { orders as customerOrders } from "../models/Order.js";
import { permissionGroupEntries } from "../models/PermissionGroup.js";
import { physicalStoreEntries } from "../models/PhysicalStore.js";
import { physicalStoreBannerSettings } from "../models/PhysicalStoreSetting.js";
import { popupOfferSettings } from "../models/PopupOffer.js";
import { productEntries } from "../models/Product.js";
import { productFilterSettings } from "../models/ProductFilterSettings.js";
import { promoCodeEntries } from "../models/PromoCode.js";
import { questionEntries } from "../models/Question.js";
import { savedBuildEntries } from "../models/SavedBuild.js";
import { serviceFinderEntries } from "../models/ServiceFinder.js";
import { serviceFinderSettings } from "../models/ServiceFinderSetting.js";
import { sessionEntries } from "../models/Session.js";
import { sliderEntries } from "../models/Slider.js";
import { sliderSettingEntries } from "../models/SliderSetting.js";
import { smsLogEntries } from "../models/SmsLog.js";
import { smsSettingEntries } from "../models/SmsSetting.js";
import { storeSettings } from "../models/StoreSetting.js";
import { teamMemberEntries } from "../models/TeamMember.js";
import { userEntries } from "../models/User.js";

export {
  categoryEntries,
  customerOrders,
  holidaySettings,
  homePageContent,
  homeSliderSettings,
  homeSliderTextEntries,
  maintenanceSetting,
  notificationEntries,
  offerEntries,
  permissionGroupEntries,
  physicalStoreBannerSettings,
  physicalStoreEntries,
  popupOfferSettings,
  productEntries,
  productFilterSettings,
  promoCodeEntries,
  questionEntries,
  savedBuildEntries,
  sequenceCounters,
  serviceFinderEntries,
  serviceFinderSettings,
  sessionEntries,
  shoppingCartItems,
  shoppingCarts,
  sliderEntries,
  sliderSettingEntries,
  smsLogEntries,
  smsSettingEntries,
  storeSettings,
  teamMemberEntries,
  userEntries,
};

const legacyDocumentTable = (name) =>
  pgTable(name, {
    id: text("id").primaryKey(),
    document: jsonb("document").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  });

// The document envelope preserves the complete existing Mongo document during
// staged migration. Tables can be normalized as their Nest services are ported.
export const auditLogs = legacyDocumentTable("audit_logs");
export const carts = legacyDocumentTable("carts");
export const legacyCategories = legacyDocumentTable("categories");
export const counters = legacyDocumentTable("counters");
export const legacyHolidayConfigs = legacyDocumentTable("holiday_configs");
export const legacyHomeContents = legacyDocumentTable("home_contents");
export const legacyHomeSliderSettings = legacyDocumentTable(
  "home_slider_settings",
);
export const legacyHomeSliderTexts = legacyDocumentTable("home_slider_texts");
export const invoices = legacyDocumentTable("invoices");
export const legacyMaintenanceSettings = legacyDocumentTable(
  "maintenance_settings",
);
export const legacyNotifications = legacyDocumentTable("notifications");
export const legacyOffers = legacyDocumentTable("offers");
export const legacyOrders = legacyDocumentTable("orders");
export const paymentGateways = legacyDocumentTable("payment_gateways");
export const legacyPermissionGroups = legacyDocumentTable("permission_groups");
export const legacyPhysicalStores = legacyDocumentTable("physical_stores");
export const legacyPhysicalStoreSettings = legacyDocumentTable(
  "physical_store_settings",
);
export const legacyPopupOffers = legacyDocumentTable("popup_offers");
export const legacyProducts = legacyDocumentTable("products");
export const legacyPromoCodes = legacyDocumentTable("promo_codes");
export const legacyQuestions = legacyDocumentTable("questions");
export const legacySavedBuilds = legacyDocumentTable("saved_builds");
export const legacySessions = legacyDocumentTable("sessions");
export const legacySliders = legacyDocumentTable("sliders");
export const legacySliderSettings = legacyDocumentTable("slider_settings");
export const legacySmsLogs = legacyDocumentTable("sms_logs");
export const legacySmsSettings = legacyDocumentTable("sms_settings");
export const legacyStoreSettings = legacyDocumentTable("store_settings");
export const teamMembers = legacyDocumentTable("team_members");
export const legacyUsers = legacyDocumentTable("users");
