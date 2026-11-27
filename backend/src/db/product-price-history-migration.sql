-- STEPUP product price history for truthful 30-day prior-price disclosures.
-- Additive only. Apply manually after review; do not run automatically in production.
BEGIN;

CREATE TABLE IF NOT EXISTS public.product_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  base_price NUMERIC(10,2) NOT NULL CHECK (base_price > 0),
  sale_price NUMERIC(10,2),
  effective_price NUMERIC(10,2) NOT NULL CHECK (effective_price > 0),
  change_type VARCHAR(24) NOT NULL CHECK (change_type IN ('initial', 'migration_baseline', 'price_change')),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sale_price IS NULL OR (sale_price > 0 AND sale_price <= base_price)),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_product_price_history_window
  ON public.product_price_history (product_id, valid_from DESC, valid_to);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_price_history_one_current
  ON public.product_price_history (product_id)
  WHERE valid_to IS NULL;

-- Existing products start an auditable history baseline at migration time.
-- We deliberately do NOT backdate this snapshot or pretend it proves the prior 30 days.
INSERT INTO public.product_price_history
  (product_id, base_price, sale_price, effective_price, change_type, valid_from)
SELECT p.id, p.base_price, p.sale_price, COALESCE(p.sale_price, p.base_price),
       'migration_baseline', NOW()
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_price_history h WHERE h.product_id = p.id
);

CREATE OR REPLACE FUNCTION public.stepup_record_product_price_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_price_history
      (product_id, base_price, sale_price, effective_price, change_type, valid_from)
    VALUES
      (NEW.id, NEW.base_price, NEW.sale_price, COALESCE(NEW.sale_price, NEW.base_price), 'initial', NOW());
    RETURN NEW;
  END IF;

  IF NEW.base_price IS DISTINCT FROM OLD.base_price
     OR NEW.sale_price IS DISTINCT FROM OLD.sale_price THEN
    UPDATE public.product_price_history
       SET valid_to = NOW()
     WHERE product_id = OLD.id AND valid_to IS NULL;

    INSERT INTO public.product_price_history
      (product_id, base_price, sale_price, effective_price, change_type, valid_from)
    VALUES
      (NEW.id, NEW.base_price, NEW.sale_price, COALESCE(NEW.sale_price, NEW.base_price), 'price_change', NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stepup_product_price_history ON public.products;
CREATE TRIGGER trg_stepup_product_price_history
AFTER INSERT OR UPDATE OF base_price, sale_price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.stepup_record_product_price_history();

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.product_price_history FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.product_price_history FROM authenticated';
  END IF;
END $$;

COMMIT;
