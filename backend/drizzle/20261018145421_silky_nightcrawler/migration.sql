CREATE TABLE "home_slider_text_entries" (
	"id" text PRIMARY KEY,
	"text" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" double precision DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_slider_text_entries_text_length_check" CHECK (char_length("text") between 1 and 200),
	CONSTRAINT "home_slider_text_entries_sort_order_check" CHECK ("sort_order" >= 0)
);
--> statement-breakpoint
CREATE INDEX "home_slider_text_entries_active_sort_order_idx" ON "home_slider_text_entries" ("active","sort_order");