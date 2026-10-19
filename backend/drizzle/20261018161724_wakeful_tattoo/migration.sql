CREATE TABLE "customer_orders" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"shipping_address" jsonb DEFAULT '{}' NOT NULL,
	"total_amount" double precision NOT NULL,
	"coupon" jsonb DEFAULT '{"code":"","discount":0}' NOT NULL,
	"payment" jsonb DEFAULT '{"method":"sslcommerz","status":"pending"}' NOT NULL,
	"order_status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"order_number" text,
	"advance_amount" double precision DEFAULT 0 NOT NULL,
	"advance_paid" double precision DEFAULT 0 NOT NULL,
	"advance_reference" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_orders_total_nonnegative" CHECK ("total_amount" >= 0),
	CONSTRAINT "customer_orders_advance_amount_nonnegative" CHECK ("advance_amount" >= 0),
	CONSTRAINT "customer_orders_advance_paid_nonnegative" CHECK ("advance_paid" >= 0)
);
--> statement-breakpoint
CREATE INDEX "customer_orders_user_created_at_idx" ON "customer_orders" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_orders_status_idx" ON "customer_orders" ("order_status");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_orders_order_number_unique" ON "customer_orders" ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_orders_payment_tran_id_unique" ON "customer_orders" (("payment"->>'tran_id'));