import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const productFilterSettings = pgTable(
  "product_filter_settings",
  {
    categoryId: text("category_id").notNull(),
    brand: text("brand").notNull().default(""),
    price: boolean("price").notNull().default(true),
    rating: boolean("rating").notNull().default(true),
    availability: boolean("availability").notNull().default(true),
    facets: jsonb("facets").notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.categoryId, table.brand] })],
);
