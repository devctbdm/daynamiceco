CREATE TABLE "saved_build_entries" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text,
	"components" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "saved_build_entries_user_created_at_idx" ON "saved_build_entries" ("user_id","created_at");