CREATE TABLE "shopping_cart_items" (
	"id" text PRIMARY KEY,
	"cart_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(12,2) NOT NULL,
	"promo_discount" numeric(12,2) DEFAULT '0' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"image" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_cart_items_price_nonnegative" CHECK ("price" >= 0),
	CONSTRAINT "shopping_cart_items_promo_discount_nonnegative" CHECK ("promo_discount" >= 0),
	CONSTRAINT "shopping_cart_items_quantity_positive" CHECK ("quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "shopping_carts" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"total_price" numeric(12,2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_carts_total_items_nonnegative" CHECK ("total_items" >= 0),
	CONSTRAINT "shopping_carts_total_price_nonnegative" CHECK ("total_price" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_cart_items_cart_product_unique" ON "shopping_cart_items" ("cart_id","product_id");--> statement-breakpoint
CREATE INDEX "shopping_cart_items_product_id_index" ON "shopping_cart_items" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_carts_user_id_unique" ON "shopping_carts" ("user_id");--> statement-breakpoint
ALTER TABLE "shopping_cart_items" ADD CONSTRAINT "shopping_cart_items_cart_id_shopping_carts_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "shopping_carts"("id") ON DELETE CASCADE;