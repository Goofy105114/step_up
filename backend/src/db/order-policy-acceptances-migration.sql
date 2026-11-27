-- Immutable per-order record of the exact published policy content accepted at checkout.
-- Apply manually after review; this file is not run automatically.
BEGIN;

CREATE TABLE IF NOT EXISTS public.order_policy_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  policy_slug VARCHAR(40) NOT NULL CHECK (policy_slug IN ('privacy', 'terms', 'shipping', 'returns')),
  policy_title VARCHAR(160) NOT NULL,
  content_sha256 CHAR(64) NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_policy_acceptances_order_policy_unique UNIQUE (order_id, policy_slug)
);

CREATE INDEX IF NOT EXISTS idx_order_policy_acceptances_user_time
  ON public.order_policy_acceptances(user_id, accepted_at DESC);

ALTER TABLE public.order_policy_acceptances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.order_policy_acceptances FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.order_policy_acceptances FROM authenticated';
  END IF;
END $$;

COMMIT;
