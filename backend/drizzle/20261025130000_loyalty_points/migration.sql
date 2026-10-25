CREATE TABLE "loyalty_settings" (
	"id" text PRIMARY KEY DEFAULT 'default',
	"enabled" boolean DEFAULT true NOT NULL,
	"points_per_hundred" double precision DEFAULT 1 NOT NULL,
	"point_value" double precision DEFAULT 0.1 NOT NULL,
	"minimum_redemption" integer DEFAULT 500 NOT NULL,
	"maximum_redemption_percent" double precision DEFAULT 10 NOT NULL,
	"expiration_days" integer DEFAULT 365 NOT NULL,
	"product_overrides" jsonb DEFAULT '[]' NOT NULL,
	"category_overrides" jsonb DEFAULT '[]' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_points_per_hundred_check" CHECK ("points_per_hundred" >= 0),
	CONSTRAINT "loyalty_point_value_check" CHECK ("point_value" > 0),
	CONSTRAINT "loyalty_minimum_redemption_check" CHECK ("minimum_redemption" >= 0),
	CONSTRAINT "loyalty_maximum_redemption_percent_check" CHECK ("maximum_redemption_percent" between 0 and 100),
	CONSTRAINT "loyalty_expiration_days_check" CHECK ("expiration_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" text PRIMARY KEY,
	"customer_id" text NOT NULL,
	"order_id" text,
	"grant_id" text,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_transactions_type_check" CHECK ("type" in ('earn', 'redeem', 'restore', 'refund', 'adjustment', 'expire'))
);
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "loyalty" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "shipping_fee" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_shipping_fee_nonnegative" CHECK ("shipping_fee" >= 0);--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_transactions_idempotency_unique" ON "loyalty_transactions" ("idempotency_key");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_customer_created_idx" ON "loyalty_transactions" ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_customer_grant_idx" ON "loyalty_transactions" ("customer_id","grant_id");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_order_idx" ON "loyalty_transactions" ("order_id");--> statement-breakpoint
CREATE INDEX "loyalty_transactions_expiration_idx" ON "loyalty_transactions" ("expires_at");--> statement-breakpoint
ALTER TABLE "customer_orders" DROP CONSTRAINT "customer_orders_order_status_check", ADD CONSTRAINT "customer_orders_order_status_check" CHECK ("order_status" in ('pending', 'processing', 'confirmed', 'send_courier', 'delivered', 'cancelled'));