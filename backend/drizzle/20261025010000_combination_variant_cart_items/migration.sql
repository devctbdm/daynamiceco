ALTER TABLE "shopping_cart_items"
  ADD COLUMN IF NOT EXISTS "variant_id" text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS "variant_label" text DEFAULT '' NOT NULL;
--> statement-breakpoint

DROP INDEX IF EXISTS "shopping_cart_items_cart_product_unique";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "shopping_cart_items_cart_product_variant_unique"
  ON "shopping_cart_items" ("cart_id", "product_id", "variant_id");
