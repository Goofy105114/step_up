-- Audit records for full refunds already confirmed by the payment provider.
-- This table does not initiate refunds. Apply manually after review and backup.
BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_refund_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider VARCHAR(32) NOT NULL CHECK (provider = 'razorpay'),
  provider_refund_id VARCHAR(255) NOT NULL UNIQUE,
  provider_payment_id VARCHAR(255) NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency = 'INR'),
  confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refund_reconciliations_confirmed_at
  ON public.payment_refund_reconciliations(confirmed_at DESC);

ALTER TABLE public.payment_refund_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.payment_refund_reconciliations FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.payment_refund_reconciliations FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.payment_refund_reconciliations FROM authenticated;
  END IF;
END $$;

COMMIT;
