CREATE TABLE "session_entries" (
	"id" text PRIMARY KEY,
	"user" text NOT NULL,
	"device" text DEFAULT 'Unknown' NOT NULL,
	"browser" text DEFAULT 'Unknown' NOT NULL,
	"os" text DEFAULT 'Unknown' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"last_active" timestamp with time zone DEFAULT now() NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "session_entries_user_last_active_idx" ON "session_entries" ("user","last_active");