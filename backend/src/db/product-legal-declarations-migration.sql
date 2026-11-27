-- Add product-level Legal Metrology declaration fields for STEPUP.
-- Additive migration only. Review and apply manually after company/legal verification.
BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS generic_product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS manufacturer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS packer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS importer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(120),
  ADD COLUMN IF NOT EXISTS consumer_care_details TEXT,
  ADD COLUMN IF NOT EXISTS mrp_inr NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS declarations_verified BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_mrp_inr_positive'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_mrp_inr_positive
      CHECK (mrp_inr IS NULL OR mrp_inr > 0) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_declarations_verification
  ON public.products (declarations_verified, is_active);

COMMIT;
