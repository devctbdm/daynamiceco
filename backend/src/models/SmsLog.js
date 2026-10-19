import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const smsLogEntries = pgTable(
  "sms_log_entries",
  {
    id: text("id").primaryKey(),
    recipients: text("recipients").array().notNull(),
    message: text("message").notNull(),
    segments: integer("segments").notNull().default(1),
    status: text("status").notNull().default("sent"),
    providerStatus: text("provider_status").notNull().default(""),
    providerMessage: text("provider_message").notNull().default(""),
    errorCode: text("error_code").notNull().default(""),
    raw: jsonb("raw").notNull().default({}),
    sentBy: text("sent_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sms_log_entries_created_at_idx").on(table.createdAt),
    check(
      "sms_log_entries_status_check",
      sql`${table.status} in ('sent', 'failed')`,
    ),
  ],
);

export function serializeSmsLog(row) {
  if (!row) return null;
  const { recipients, ...log } = row;
  return { ...log, to: recipients, _id: row.id };
}
