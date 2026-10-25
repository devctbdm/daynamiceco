import {
  Controller,
  Get,
  Inject,
  Logger,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import CartModule from "./cart/cart.module.js";
import CategoriesModule from "./categories/categories.module.js";
import CounterModule from "./counters/counter.module.js";
import { DATABASE } from "./db/database.js";
import DatabaseModule from "./db/database.module.js";
import HolidayModule from "./holidays/holiday.module.js";
import HomeContentModule from "./home-content/home-content.module.js";
import HomeSliderSettingsModule from "./home-slider-settings/home-slider-settings.module.js";
import HomeSliderTextsModule from "./home-slider-texts/home-slider-texts.module.js";
import LoyaltyModule from "./loyalty/loyalty.module.js";
import MaintenanceModule from "./maintenance/maintenance.module.js";
import NotificationsModule from "./notifications/notifications.module.js";
import OffersModule from "./offers/offers.module.js";
import OrdersModule from "./orders/orders.module.js";
import PaymentsModule from "./payments/payments.module.js";
import PermissionGroupsModule from "./permission-groups/permission-groups.module.js";
import PhysicalStoresModule from "./physical-stores/physical-stores.module.js";
import PopupOffersModule from "./popup-offers/popup-offers.module.js";
import ProductFiltersModule from "./product-filters/product-filters.module.js";
import ProductsModule from "./products/products.module.js";
import PromosModule from "./promos/promos.module.js";
import QuestionsModule from "./questions/questions.module.js";
import SavedBuildsModule from "./saved-builds/saved-builds.module.js";
import ServiceFindersModule from "./service-finders/service-finders.module.js";
import SlidersModule from "./sliders/sliders.module.js";
import SmsSettingsModule from "./sms-settings/sms-settings.module.js";
import StoreSettingsModule from "./store-settings/store-settings.module.js";
import TeamMembersModule from "./team-members/team-members.module.js";
import UsersModule from "./users/users.module.js";

class HealthController {
  constructor(database) {
    this.database = database;
  }

  root() {
    return { status: "OK", message: "Apple IT Zone NestJS backend is running" };
  }

  async health() {
    try {
      await this.database.execute(sql`select 1`);
      return {
        success: true,
        status: "healthy",
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      Logger.error("Neon database health check failed", error.stack);
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}

Controller()(HealthController);
Inject(DATABASE)(HealthController, undefined, 0);
Get()(
  HealthController.prototype,
  "root",
  Object.getOwnPropertyDescriptor(HealthController.prototype, "root"),
);
Get("health")(
  HealthController.prototype,
  "health",
  Object.getOwnPropertyDescriptor(HealthController.prototype, "health"),
);

class AppModule {}

Module({
  imports: [
    DatabaseModule,
    CategoriesModule,
    CartModule,
    CounterModule,
    HolidayModule,
    HomeContentModule,
    HomeSliderSettingsModule,
    HomeSliderTextsModule,
    MaintenanceModule,
    OffersModule,
    OrdersModule,
    PaymentsModule,
    PermissionGroupsModule,
    PhysicalStoresModule,
    PopupOffersModule,
    ProductsModule,
    ProductFiltersModule,
    PromosModule,
    QuestionsModule,
    UsersModule,
    StoreSettingsModule,
    TeamMembersModule,
    SlidersModule,
    SmsSettingsModule,
    SavedBuildsModule,
    ServiceFindersModule,
    NotificationsModule,
    LoyaltyModule,
  ],
  controllers: [HealthController],
})(AppModule);

export default AppModule;
