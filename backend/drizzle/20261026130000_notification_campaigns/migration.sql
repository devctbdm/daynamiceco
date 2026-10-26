CREATE TABLE "notification_campaign_entries" (
  "id" text PRIMARY KEY,
  "category" text DEFAULT 'system' NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "link" text DEFAULT '' NOT NULL,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_campaign_entries_category_check"
    CHECK ("category" in ('order', 'delivery', 'rider', 'payment', 'system')),
  CONSTRAINT "notification_campaign_entries_title_check"
    CHECK (length(trim("title")) > 0),
  CONSTRAINT "notification_campaign_entries_description_check"
    CHECK (length(trim("description")) > 0)
);
--> statement-breakpoint
CREATE INDEX "notification_campaign_entries_created_at_idx"
ON "notification_campaign_entries" ("created_at");
--> statement-breakpoint
ALTER TABLE "notification_entries" ADD COLUMN "campaign_id" text;
--> statement-breakpoint
CREATE INDEX "notification_entries_campaign_id_idx"
ON "notification_entries" ("campaign_id");
