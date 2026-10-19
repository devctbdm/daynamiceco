CREATE TABLE "offer_entries" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"full_description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "offer_entries_slug_unique" ON "offer_entries" ("slug");--> statement-breakpoint
CREATE INDEX "offer_entries_active_created_at_idx" ON "offer_entries" ("active","created_at");