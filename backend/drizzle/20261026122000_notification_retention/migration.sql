CREATE INDEX "notification_entries_read_updated_at_idx"
ON "notification_entries" ("updated_at")
WHERE "read" = true;
--> statement-breakpoint
CREATE INDEX "notification_entries_unread_created_at_idx"
ON "notification_entries" ("created_at")
WHERE "read" = false;
