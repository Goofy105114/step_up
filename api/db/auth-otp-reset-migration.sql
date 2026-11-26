BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  provider_request_id TEXT NOT NULL UNIQUE,
  identifier TEXT NOT NULL,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('register','login','admin','checkout','password_reset')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_identifier_created
  ON public.auth_otp_challenges(identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_expiry
  ON public.auth_otp_challenges(expires_at);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
  ON public.password_reset_tokens(user_id, created_at DESC);

ALTER TABLE public.auth_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_otp_challenges FROM anon, authenticated;
REVOKE ALL ON TABLE public.password_reset_tokens FROM anon, authenticated;

COMMIT;
