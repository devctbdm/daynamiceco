CREATE TABLE "physical_store_banner_settings" (
	"id" text PRIMARY KEY DEFAULT 'default',
	"enabled" boolean DEFAULT true NOT NULL,
	"title" text DEFAULT 'Physical Stores' NOT NULL,
	"subtitle" text DEFAULT 'Visit Our Store & Get Your Desired IT Product!' NOT NULL,
	"button_label" text DEFAULT 'Find Our Stores' NOT NULL,
	"button_link" text DEFAULT '/physical-stores' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"banner_url" text DEFAULT '' NOT NULL,
	"show_count" boolean DEFAULT true NOT NULL,
	"count_suffix" text DEFAULT '+' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_store_entries" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"phones" jsonb DEFAULT '[]' NOT NULL,
	"open_time" text DEFAULT '' NOT NULL,
	"close_time" text DEFAULT '' NOT NULL,
	"off_day" text DEFAULT '' NOT NULL,
	"map_url" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_store_entries_title_length_check" CHECK (char_length("title") between 1 and 120),
	CONSTRAINT "physical_store_entries_sort_order_nonnegative" CHECK ("sort_order" >= 0),
	CONSTRAINT "physical_store_entries_phones_array_check" CHECK (jsonb_typeof("phones") = 'array')
);
--> statement-breakpoint
CREATE INDEX "physical_store_entries_active_sort_order_idx" ON "physical_store_entries" ("active","sort_order");