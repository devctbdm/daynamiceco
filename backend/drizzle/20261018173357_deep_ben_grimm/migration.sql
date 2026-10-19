CREATE TABLE "user_entries" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone" text NOT NULL,
	"address" jsonb DEFAULT '{"street":"","city":"Dhaka","state":"Dhaka","postcode":"1000","country":"Bangladesh"}' NOT NULL,
	"addresses" jsonb DEFAULT '[]' NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"reset_password_token" text,
	"reset_password_expire" timestamp with time zone,
	"two_factor_otp" text,
	"two_factor_otp_expire" timestamp with time zone,
	"two_factor_attempts" integer DEFAULT 0 NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"lock_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_entries_name_length_check" CHECK (length(trim("name")) between 1 and 50),
	CONSTRAINT "user_entries_email_check" CHECK ("email" ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
	CONSTRAINT "user_entries_password_length_check" CHECK (length("password") >= 6),
	CONSTRAINT "user_entries_phone_check" CHECK (length(trim("phone")) > 0),
	CONSTRAINT "user_entries_role_check" CHECK ("role" in ('super_admin', 'admin', 'manager', 'customer')),
	CONSTRAINT "user_entries_status_check" CHECK ("status" in ('active', 'inactive', 'suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_entries_email_uidx" ON "user_entries" ("email");--> statement-breakpoint
CREATE INDEX "user_entries_role_created_at_idx" ON "user_entries" ("role","created_at");--> statement-breakpoint
CREATE INDEX "user_entries_status_idx" ON "user_entries" ("status");