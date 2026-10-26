import { NestFactory } from "@nestjs/core";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import "reflect-metadata";
import app from "./src/app.js";
import AppModule from "./src/app.module.js";
import { closeRedis, connectRedis } from "./src/config/redis.js";
import { closeDatabase, getDatabase } from "./src/db/database.js";
import {
  emitToCustomer,
  initSocket,
  queueAdminNotificationRefresh,
} from "./src/socket.js";
import { startNotificationRefreshSubscriber } from "./src/notifications/notification-queue.js";
import {
  backfillOrderNumbers,
  migrateLegacyOrderData,
} from "./src/utils/orderNumber.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Verify PostgreSQL (Neon) connectivity before serving traffic
try {
  await getDatabase().execute(sql`select 1`);
  console.log("✅ PostgreSQL (Neon) connected");
} catch (error) {
  console.error(`❌ PostgreSQL connection failed: ${error.message}`);
  process.exit(1);
}

// Redis is required for notification queueing.
await connectRedis({ required: true });

const orderMigration = await migrateLegacyOrderData(getDatabase());
if (orderMigration.statuses) {
  console.log(
    `🔄 Migrated ${orderMigration.statuses} legacy order(s) to processing`,
  );
}
if (orderMigration.orderNumbers) {
  console.log(
    `🔄 Migrated ${orderMigration.orderNumbers} legacy order number(s) to # format`,
  );
}

const backfilledOrders = await backfillOrderNumbers();
if (backfilledOrders) {
  console.log(`🆔 Backfilled ${backfilledOrders} order number(s)`);
}

// Start server after successful connection
const nestApp = await NestFactory.create(AppModule);
nestApp.setGlobalPrefix("api");
nestApp.use(app);
await nestApp.init();
// Attach Socket.io for real-time admin notifications
const server = nestApp.getHttpServer();
initSocket(server);
const stopNotificationRefreshSubscriber =
  await startNotificationRefreshSubscriber({
    onAdminNotification: queueAdminNotificationRefresh,
    onCustomerNotification: (userId, notification) =>
      emitToCustomer(userId, "notification:new", notification),
  });
await nestApp.listen(PORT, "0.0.0.0");
console.log(`🚀 NestJS server running on http://localhost:${PORT}`);

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);
  await stopNotificationRefreshSubscriber();
  await nestApp.close();
  await closeDatabase();
  await closeRedis();
  console.log("👋 Server closed");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
