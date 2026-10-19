CREATE TABLE "maintenance_config" (
	"id" text PRIMARY KEY DEFAULT 'default',
	"enabled" boolean DEFAULT false NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"end_at" timestamp with time zone,
	"contact_email" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"selling_enabled" boolean DEFAULT true NOT NULL,
	"selling_message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
