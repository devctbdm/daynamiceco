CREATE TABLE "home_slider_text_settings" (
	"id" text PRIMARY KEY DEFAULT 'default',
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
