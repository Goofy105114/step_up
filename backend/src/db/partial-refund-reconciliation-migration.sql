-- Allow multiple provider-confirmed partial refund records per order.
-- Existing full-refund records are preserved.
BEGIN;

ALTER TABLE public.payment_refund_reconciliations
  DROP CONSTRAINT IF EXISTS payment_refund_reconciliations_order_id_key;

CREATE INDEX IF NOT EXISTS idx_payment_refund_reconciliations_order_time
  ON public.payment_refund_reconciliations(order_id, confirmed_at ASC);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_refund_reconciliations_amount_check'
      AND conrelid = 'public.payment_refund_reconciliations'::regclass
  ) THEN
    ALTER TABLE public.payment_refund_reconciliations
      ADD CONSTRAINT payment_refund_reconciliations_amount_check CHECK (amount_paise > 0);
  END IF;
END $$;

COMMIT;
