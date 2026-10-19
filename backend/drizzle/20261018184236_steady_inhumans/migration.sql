CREATE TABLE "notification_entries" (
	"id" text PRIMARY KEY,
	"category" text DEFAULT 'system' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_entries_category_check" CHECK ("category" in ('order', 'delivery', 'rider', 'payment', 'system')),
	CONSTRAINT "notification_entries_title_check" CHECK (length(trim("title")) > 0),
	CONSTRAINT "notification_entries_description_check" CHECK (length(trim("description")) > 0)
);
--> statement-breakpoint
CREATE INDEX "notification_entries_created_at_idx" ON "notification_entries" ("created_at");--> statement-breakpoint
CREATE INDEX "notification_entries_read_idx" ON "notification_entries" ("read");