-- Additive Razorpay payment reconciliation and webhook idempotency support.
-- Apply manually only after reviewing and backing up the target database.
BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id_unique
  ON orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  event_id             VARCHAR(255) PRIMARY KEY,
  event_type           VARCHAR(100) NOT NULL,
  razorpay_payment_id  VARCHAR(255) NOT NULL,
  razorpay_order_id    VARCHAR(255) NOT NULL,
  order_id              UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount_paise          BIGINT NOT NULL CHECK (amount_paise > 0),
  currency              VARCHAR(3) NOT NULL CHECK (currency = 'INR'),
  processing_status     VARCHAR(20) NOT NULL
    CHECK (processing_status IN ('processed', 'unmatched')),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_order
  ON razorpay_webhook_events (order_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_payment
  ON razorpay_webhook_events (razorpay_payment_id, received_at DESC);

ALTER TABLE razorpay_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE razorpay_webhook_events FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE razorpay_webhook_events FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE razorpay_webhook_events FROM authenticated;
  END IF;
END
$$;

COMMIT;
