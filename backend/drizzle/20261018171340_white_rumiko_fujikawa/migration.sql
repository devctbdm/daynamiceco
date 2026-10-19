CREATE TABLE "promo_code_entries" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'percentage' NOT NULL,
	"value" double precision NOT NULL,
	"min_order" double precision DEFAULT 0 NOT NULL,
	"max_discount" double precision DEFAULT 0 NOT NULL,
	"max_uses" double precision DEFAULT 0 NOT NULL,
	"per_user_limit" double precision DEFAULT 1 NOT NULL,
	"usage_count" double precision DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_code_entries_type_check" CHECK ("type" in ('percentage', 'fixed', 'free_shipping')),
	CONSTRAINT "promo_code_entries_status_check" CHECK ("status" in ('active', 'inactive')),
	CONSTRAINT "promo_code_entries_value_nonnegative" CHECK ("value" >= 0),
	CONSTRAINT "promo_code_entries_percentage_max" CHECK ("type" <> 'percentage' or "value" <= 100),
	CONSTRAINT "promo_code_entries_min_order_nonnegative" CHECK ("min_order" >= 0),
	CONSTRAINT "promo_code_entries_max_discount_nonnegative" CHECK ("max_discount" >= 0),
	CONSTRAINT "promo_code_entries_max_uses_nonnegative" CHECK ("max_uses" >= 0),
	CONSTRAINT "promo_code_entries_per_user_limit_nonnegative" CHECK ("per_user_limit" >= 0),
	CONSTRAINT "promo_code_entries_usage_count_nonnegative" CHECK ("usage_count" >= 0),
	CONSTRAINT "promo_code_entries_categories_array_check" CHECK (jsonb_typeof("categories") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "promo_code_entries_code_unique" ON "promo_code_entries" ("code");--> statement-breakpoint
CREATE INDEX "promo_code_entries_status_created_at_idx" ON "promo_code_entries" ("status","created_at");