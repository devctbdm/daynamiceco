CREATE TABLE "service_finder_entries" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'sparkles' NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_finder_entries_title_length_check" CHECK (char_length("title") between 1 and 80),
	CONSTRAINT "service_finder_entries_subtitle_length_check" CHECK (char_length("subtitle") <= 160),
	CONSTRAINT "service_finder_entries_sort_order_check" CHECK ("sort_order" >= 0)
);
--> statement-breakpoint
CREATE INDEX "service_finder_entries_active_sort_order_idx" ON "service_finder_entries" ("active","sort_order");--> statement-breakpoint
-- Seed the three cards that used to be hard-coded in the storefront
-- (components/homeComponents/ServiceBox.tsx) so the homepage is unchanged and
-- every card becomes editable from /admin/service-finder.
INSERT INTO "service_finder_entries" ("id", "title", "subtitle", "icon", "href", "active", "sort_order")
VALUES
	('5f1c2d3e4a5b6c7d8e9f0011', 'Laptop Finder', 'Find the perfect laptop for your needs', 'laptop', '', true, 0),
	('5f1c2d3e4a5b6c7d8e9f0022', 'Raise a complaint', 'Raise a complaint about any issue', 'complaint', '', true, 1),
	('5f1c2d3e4a5b6c7d8e9f0033', 'Service center', 'Get your laptop repaired at our service center', 'repair', '', true, 2)
ON CONFLICT ("id") DO NOTHING;