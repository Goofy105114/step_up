-- Immutable seller identity snapshot captured when a new STEPUP order is placed.
-- Additive only. Existing orders are intentionally not backfilled with current identity data.
BEGIN;

CREATE TABLE IF NOT EXISTS public.order_seller_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_identity JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_seller_snapshots_identity_object
    CHECK (jsonb_typeof(seller_identity) = 'object')
);

ALTER TABLE public.order_seller_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.order_seller_snapshots FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.order_seller_snapshots FROM authenticated';
  END IF;
END $$;

COMMIT;
