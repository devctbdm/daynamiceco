CREATE TABLE "permission_group_entries" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"permissions" jsonb DEFAULT '[]' NOT NULL,
	"created_by" jsonb DEFAULT '{"id":null,"name":""}' NOT NULL,
	"updated_by" jsonb DEFAULT '{"id":null,"name":""}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permission_group_entries_name_length_check" CHECK (char_length("name") between 1 and 80),
	CONSTRAINT "permission_group_entries_description_length_check" CHECK (char_length("description") <= 300),
	CONSTRAINT "permission_group_entries_permissions_array_check" CHECK (jsonb_typeof("permissions") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "permission_group_entries_name_unique" ON "permission_group_entries" (lower("name"));