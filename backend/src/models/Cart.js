import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const shoppingCarts = pgTable(
  "shopping_carts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    totalItems: integer("total_items").notNull().default(0),
    totalPrice: numeric("total_price", {
      precision: 12,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("shopping_carts_user_id_unique").on(table.userId),
    check(
      "shopping_carts_total_items_nonnegative",
      sql`${table.totalItems} >= 0`,
    ),
    check(
      "shopping_carts_total_price_nonnegative",
      sql`${table.totalPrice} >= 0`,
    ),
  ],
);

export const shoppingCartItems = pgTable(
  "shopping_cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => shoppingCarts.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    name: text("name").notNull(),
    price: numeric("price", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
    promoDiscount: numeric("promo_discount", {
      precision: 12,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    quantity: integer("quantity").notNull().default(1),
    image: text("image").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("shopping_cart_items_cart_product_unique").on(
      table.cartId,
      table.productId,
    ),
    index("shopping_cart_items_product_id_index").on(table.productId),
    check("shopping_cart_items_price_nonnegative", sql`${table.price} >= 0`),
    check(
      "shopping_cart_items_promo_discount_nonnegative",
      sql`${table.promoDiscount} >= 0`,
    ),
    check("shopping_cart_items_quantity_positive", sql`${table.quantity} >= 1`),
  ],
);
