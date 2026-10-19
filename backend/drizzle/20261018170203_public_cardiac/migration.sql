CREATE TABLE "product_entries" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"price" double precision NOT NULL,
	"discount_price" double precision DEFAULT 0 NOT NULL,
	"cost_price" double precision DEFAULT 0 NOT NULL,
	"sku" text,
	"product_code" text,
	"brand" text,
	"category" text NOT NULL,
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"images" jsonb NOT NULL,
	"image_alts" jsonb DEFAULT '[]' NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"holiday" boolean DEFAULT false NOT NULL,
	"pc_part" jsonb DEFAULT '{"enabled":false,"type":"","socket":"","platform":"","formFactor":"","wattage":0,"specs":{}}' NOT NULL,
	"specifications" jsonb DEFAULT '{}' NOT NULL,
	"content" jsonb DEFAULT '""' NOT NULL,
	"seo" jsonb DEFAULT '{}' NOT NULL,
	"ratings" jsonb DEFAULT '[]' NOT NULL,
	"average_rating" double precision DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_entries_price_nonnegative" CHECK ("price" >= 0),
	CONSTRAINT "product_entries_discount_price_nonnegative" CHECK ("discount_price" >= 0),
	CONSTRAINT "product_entries_cost_price_nonnegative" CHECK ("cost_price" >= 0),
	CONSTRAINT "product_entries_stock_nonnegative" CHECK ("stock" >= 0),
	CONSTRAINT "product_entries_status_check" CHECK ("status" in ('active', 'draft', 'out_of_stock')),
	CONSTRAINT "product_entries_average_rating_check" CHECK ("average_rating" between 0 and 5),
	CONSTRAINT "product_entries_categories_array_check" CHECK (jsonb_typeof("categories") = 'array'),
	CONSTRAINT "product_entries_images_array_check" CHECK (jsonb_typeof("images") = 'array' and jsonb_array_length("images") > 0),
	CONSTRAINT "product_entries_ratings_array_check" CHECK (jsonb_typeof("ratings") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "product_entries_slug_unique" ON "product_entries" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "product_entries_product_code_unique" ON "product_entries" ("product_code") WHERE "product_code" is not null and "product_code" <> '';--> statement-breakpoint
CREATE INDEX "product_entries_sku_idx" ON "product_entries" ("sku");--> statement-breakpoint
CREATE INDEX "product_entries_brand_idx" ON "product_entries" ("brand");--> statement-breakpoint
CREATE INDEX "product_entries_category_price_idx" ON "product_entries" ("category","price");--> statement-breakpoint
CREATE INDEX "product_entries_status_created_at_idx" ON "product_entries" ("status","created_at");