CREATE TABLE IF NOT EXISTS "product_filter_settings" (
	"category_id" text PRIMARY KEY,
	"price" boolean DEFAULT true NOT NULL,
	"rating" boolean DEFAULT true NOT NULL,
	"availability" boolean DEFAULT true NOT NULL,
	"facets" jsonb DEFAULT '[]' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
