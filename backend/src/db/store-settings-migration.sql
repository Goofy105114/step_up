-- Database-backed STEPUP store settings.
-- Defaults preserve the current checkout calculation; admins can change them in Store settings.
BEGIN;

CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(120) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.store_settings (setting_key, setting_value, description)
VALUES (
  'checkout_pricing',
  '{"free_shipping_threshold_inr":599,"shipping_fee_inr":99,"gst_rate_percent":5}'::jsonb,
  'Checkout shipping threshold, shipping fee and GST rate. Applies to new orders.'
)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.store_settings FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.store_settings FROM authenticated';
  END IF;
END $$;

COMMIT;
