CREATE TABLE "holiday_settings" (
	"key" text PRIMARY KEY DEFAULT 'default',
	"hero_badge" text DEFAULT 'Special Holiday Offer' NOT NULL,
	"title" text DEFAULT 'Mega Offer' NOT NULL,
	"subtitle" text DEFAULT 'Celebrate the season with amazing deals on your favorite products!' NOT NULL,
	"discount_percent" real DEFAULT 70 NOT NULL,
	"end_date" timestamp with time zone DEFAULT '2026-12-31 17:59:59.000+00',
	"coupon_code" text DEFAULT 'HOLIDAY10' NOT NULL,
	"coupon_description" text DEFAULT 'Use the code below at checkout and stack your savings on top of holiday prices.' NOT NULL,
	"top_deals_title" text DEFAULT 'Top Holiday Deals' NOT NULL,
	"top_deals_subtitle" text DEFAULT 'Hand-picked favorites at their lowest prices of the year.' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holiday_settings_discount_percent_nonnegative" CHECK ("discount_percent" >= 0)
);
