import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { closeRedis, connectRedis } from "../src/config/redis.js";
import { closeDatabase, getDatabase } from "../src/db/database.js";
import { startNotificationWorker } from "../src/notifications/notification-queue.js";

dotenv.config();

let stopWorker;
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Stopping notification worker (${signal})...`);
  await stopWorker?.();
  await closeRedis();
  await closeDatabase();
  process.exit(0);
};

try {
  await getDatabase().execute(sql`select 1`);
  await connectRedis({ required: true });
  stopWorker = await startNotificationWorker();
  console.log("Notification queue worker is running");
} catch (error) {
  console.error("Notification worker startup failed:", error.message);
  await closeRedis();
  await closeDatabase();
  process.exit(1);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
