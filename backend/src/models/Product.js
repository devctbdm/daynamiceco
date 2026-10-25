import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const productEntries = pgTable(
  "product_entries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    price: doublePrecision("price").notNull(),
    discountPrice: doublePrecision("discount_price").notNull().default(0),
    costPrice: doublePrecision("cost_price").notNull().default(0),
    sku: text("sku"),
    productCode: text("product_code"),
    brand: text("brand"),
    category: text("category").notNull(),
    categories: jsonb("categories").notNull().default([]),
    images: jsonb("images").notNull(),
    imageAlts: jsonb("image_alts").notNull().default([]),
    stock: doublePrecision("stock").notNull().default(0),
    status: text("status").notNull().default("active"),
    featured: boolean("featured").notNull().default(false),
    holiday: boolean("holiday").notNull().default(false),
    pcPart: jsonb("pc_part").notNull().default({
      enabled: false,
      type: "",
      socket: "",
      platform: "",
      formFactor: "",
      wattage: 0,
      specs: {},
    }),
    specifications: jsonb("specifications").notNull().default({}),
    content: jsonb("content").notNull().default(""),
    seo: jsonb("seo").notNull().default({}),
    ratings: jsonb("ratings").notNull().default([]),
    averageRating: doublePrecision("average_rating").notNull().default(0),
    variants: jsonb("variants").notNull().default([]),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_entries_slug_unique").on(table.slug),
    uniqueIndex("product_entries_product_code_unique")
      .on(table.productCode)
      .where(
        sql`${table.productCode} is not null and ${table.productCode} <> ''`,
      ),
    index("product_entries_sku_idx").on(table.sku),
    index("product_entries_brand_idx").on(table.brand),
    index("product_entries_category_price_idx").on(table.category, table.price),
    index("product_entries_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    check("product_entries_price_nonnegative", sql`${table.price} >= 0`),
    check(
      "product_entries_discount_price_nonnegative",
      sql`${table.discountPrice} >= 0`,
    ),
    check(
      "product_entries_cost_price_nonnegative",
      sql`${table.costPrice} >= 0`,
    ),
    check("product_entries_stock_nonnegative", sql`${table.stock} >= 0`),
    check(
      "product_entries_status_check",
      sql`${table.status} in ('active', 'draft', 'out_of_stock')`,
    ),
    check(
      "product_entries_average_rating_check",
      sql`${table.averageRating} between 0 and 5`,
    ),
    check(
      "product_entries_categories_array_check",
      sql`jsonb_typeof(${table.categories}) = 'array'`,
    ),
    check(
      "product_entries_images_array_check",
      sql`jsonb_typeof(${table.images}) = 'array' and jsonb_array_length(${table.images}) > 0`,
    ),
    check(
      "product_entries_ratings_array_check",
      sql`jsonb_typeof(${table.ratings}) = 'array'`,
    ),
  ],
);
