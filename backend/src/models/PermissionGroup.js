import {
  boolean,
  check,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const permissionGroupEntries = pgTable(
  "permission_group_entries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#6366f1"),
    permissions: jsonb("permissions").notNull().default([]),
    createdBy: jsonb("created_by").notNull().default({ id: null, name: "" }),
    updatedBy: jsonb("updated_by").notNull().default({ id: null, name: "" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("permission_group_entries_name_unique").on(
      sql`lower(${table.name})`,
    ),
    check(
      "permission_group_entries_name_length_check",
      sql`char_length(${table.name}) between 1 and 80`,
    ),
    check(
      "permission_group_entries_description_length_check",
      sql`char_length(${table.description}) <= 300`,
    ),
    check(
      "permission_group_entries_permissions_array_check",
      sql`jsonb_typeof(${table.permissions}) = 'array'`,
    ),
  ],
);
