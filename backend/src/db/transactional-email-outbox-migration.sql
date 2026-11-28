-- Durable transactional email outbox. Apply through the reviewed db:migrate command.
BEGIN;

CREATE TABLE IF NOT EXISTS public.transactional_email_outbox (
  id BIGSERIAL PRIMARY KEY,
  event_key VARCHAR(200) NOT NULL UNIQUE,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
    'order_confirmation','order_shipped','order_delivered','order_cancelled',
    'return_received','return_decision','refund_confirmed'
  )),
  recipient_email VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','dead')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  provider_message_id VARCHAR(255),
  last_error VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactional_email_outbox_pending
  ON public.transactional_email_outbox (available_at, id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_transactional_email_outbox_stale
  ON public.transactional_email_outbox (locked_at)
  WHERE status = 'processing';

ALTER TABLE public.transactional_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.transactional_email_outbox FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.transactional_email_outbox FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.transactional_email_outbox FROM authenticated;
  END IF;
END
$$;

COMMIT;
