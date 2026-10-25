ALTER TABLE "product_filter_settings"
ADD COLUMN IF NOT EXISTS "brand" text DEFAULT '' NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_filter_settings_pkey'
      AND conrelid = 'product_filter_settings'::regclass
  ) THEN
    ALTER TABLE "product_filter_settings"
    DROP CONSTRAINT "product_filter_settings_pkey";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_filter_settings_category_id_brand_pk'
      AND conrelid = 'product_filter_settings'::regclass
  ) THEN
    ALTER TABLE "product_filter_settings"
    ADD CONSTRAINT "product_filter_settings_category_id_brand_pk"
    PRIMARY KEY ("category_id", "brand");
  END IF;
END $$;
