import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const homePageContent = pgTable("home_page_content", {
  id: text("id").primaryKey().default("default"),
  content: text("content").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
