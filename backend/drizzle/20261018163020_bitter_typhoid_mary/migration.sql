CREATE TABLE "category_entries" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"parent_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"banner_url" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#0071e3' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_entries_name_length_check" CHECK (char_length("name") between 1 and 200)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "category_entries_slug_unique" ON "category_entries" ("slug");--> statement-breakpoint
CREATE INDEX "category_entries_parent_sort_order_idx" ON "category_entries" ("parent_id","sort_order");