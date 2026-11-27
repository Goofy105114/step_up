-- Customer grievance intake and admin tracking.
-- Additive only. Apply manually after review; never run automatically in production.
BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_grievances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(40) UNIQUE NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  order_number VARCHAR(50),
  subject VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
  admin_note TEXT,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolution_due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  resolved_at TIMESTAMPTZ,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_grievances_name_length CHECK (char_length(trim(customer_name)) BETWEEN 2 AND 200),
  CONSTRAINT customer_grievances_email_length CHECK (char_length(trim(customer_email)) BETWEEN 5 AND 255),
  CONSTRAINT customer_grievances_message_length CHECK (char_length(trim(message)) BETWEEN 10 AND 5000)
);

CREATE INDEX IF NOT EXISTS idx_customer_grievances_status_due
  ON public.customer_grievances(status, resolution_due_at ASC);
CREATE INDEX IF NOT EXISTS idx_customer_grievances_created
  ON public.customer_grievances(created_at DESC);

ALTER TABLE public.customer_grievances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.customer_grievances FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.customer_grievances FROM authenticated';
  END IF;
END $$;

COMMIT;
