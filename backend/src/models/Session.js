import { index, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const sessionEntries = pgTable(
  "session_entries",
  {
    id: text("id").primaryKey(),
    user: text("user").notNull(),
    device: text("device").notNull().default("Unknown"),
    browser: text("browser").notNull().default("Unknown"),
    os: text("os").notNull().default("Unknown"),
    ip: text("ip").notNull().default(""),
    location: text("location").notNull().default(""),
    lastActive: timestamp("last_active", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("session_entries_user_last_active_idx").on(
      table.user,
      table.lastActive,
    ),
  ],
);

export function serializeSession(row) {
  if (!row) return null;
  return { ...row, _id: row.id };
}
