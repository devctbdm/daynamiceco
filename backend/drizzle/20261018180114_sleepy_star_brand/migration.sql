CREATE TABLE "team_member_entries" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'manager' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp with time zone,
	"password" text,
	"phone" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"permission_group" text,
	"custom_permissions" jsonb DEFAULT '[]' NOT NULL,
	"two_factor_otp" text,
	"two_factor_otp_expire" timestamp with time zone,
	"two_factor_attempts" integer DEFAULT 0 NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"lock_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_member_entries_name_length_check" CHECK (length(trim("name")) >= 1),
	CONSTRAINT "team_member_entries_role_check" CHECK ("role" in ('admin', 'manager', 'super_admin')),
	CONSTRAINT "team_member_entries_custom_permissions_array_check" CHECK (jsonb_typeof("custom_permissions") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_entries_email_uidx" ON "team_member_entries" ("email");--> statement-breakpoint
CREATE INDEX "team_member_entries_role_active_idx" ON "team_member_entries" ("role","active");--> statement-breakpoint
CREATE INDEX "team_member_entries_permission_group_idx" ON "team_member_entries" ("permission_group");