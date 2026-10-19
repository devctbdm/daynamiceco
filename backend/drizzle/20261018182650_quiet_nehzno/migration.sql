CREATE TABLE "sms_log_entries" (
	"id" text PRIMARY KEY,
	"recipients" text[] NOT NULL,
	"message" text NOT NULL,
	"segments" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"provider_status" text DEFAULT '' NOT NULL,
	"provider_message" text DEFAULT '' NOT NULL,
	"error_code" text DEFAULT '' NOT NULL,
	"raw" jsonb DEFAULT '{}' NOT NULL,
	"sent_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_log_entries_status_check" CHECK ("status" in ('sent', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "sms_log_entries_created_at_idx" ON "sms_log_entries" ("created_at");