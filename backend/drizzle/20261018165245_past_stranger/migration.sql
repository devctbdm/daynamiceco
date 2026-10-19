CREATE TABLE "popup_offer_settings" (
	"id" text PRIMARY KEY DEFAULT 'default',
	"image" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"delay_seconds" integer DEFAULT 30 NOT NULL,
	"max_shows_per_day" integer DEFAULT 1 NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "popup_offer_settings_delay_seconds_check" CHECK ("delay_seconds" between 30 and 300),
	CONSTRAINT "popup_offer_settings_max_shows_check" CHECK ("max_shows_per_day" between 1 and 3)
);
