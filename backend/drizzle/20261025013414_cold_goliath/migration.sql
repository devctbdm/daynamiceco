DROP INDEX "shopping_cart_items_cart_product_unique";--> statement-breakpoint
ALTER TABLE "product_entries" ADD COLUMN "variants" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "shopping_cart_items" ADD COLUMN "variant_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "shopping_cart_items" ADD COLUMN "variant_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_cart_items_cart_product_variant_unique" ON "shopping_cart_items" ("cart_id","product_id","variant_id");