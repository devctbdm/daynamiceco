import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const savedBuildEntries = pgTable(
  "saved_build_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name"),
    components: jsonb("components").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("saved_build_entries_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export function serializeSavedBuild(row) {
  if (!row) return null;
  const { id, userId, ...build } = row;
  return {
    ...build,
    user: userId,
    _id: id,
  };
}
