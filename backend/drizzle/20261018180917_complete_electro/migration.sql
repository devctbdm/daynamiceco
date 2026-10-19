CREATE TABLE "slider_entries" (
	"id" text PRIMARY KEY,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'hero' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slider_entries_title_length_check" CHECK (char_length("title") <= 200),
	CONSTRAINT "slider_entries_description_length_check" CHECK (char_length("description") <= 500),
	CONSTRAINT "slider_entries_type_check" CHECK ("type" in ('hero', 'ad_top', 'ad_bottom')),
	CONSTRAINT "slider_entries_sort_order_check" CHECK ("sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "slider_setting_entries" (
	"id" text PRIMARY KEY DEFAULT 'default',
	"enabled" boolean DEFAULT true NOT NULL,
	"auto_slide" boolean DEFAULT true NOT NULL,
	"interval" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slider_setting_entries_singleton_check" CHECK ("id" = 'default'),
	CONSTRAINT "slider_setting_entries_interval_check" CHECK ("interval" between 3 and 10)
);
--> statement-breakpoint
CREATE INDEX "slider_entries_type_sort_order_idx" ON "slider_entries" ("type","sort_order");--> statement-breakpoint
CREATE INDEX "slider_entries_active_idx" ON "slider_entries" ("active");