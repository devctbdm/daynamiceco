ALTER TABLE "notification_entries"
ADD COLUMN "user_id" text;
--> statement-breakpoint
CREATE INDEX "notification_entries_user_created_at_idx"
ON "notification_entries" ("user_id", "created_at");
