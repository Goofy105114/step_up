-- Additive STEPUP fit, laboratory and research schema for the Render backend.
-- Apply to the existing database before deploying code that uses these features.
-- No existing table is dropped and no existing rows are rewritten.
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS care_instructions TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS arch_support_level VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS arch_height_mm DECIMAL(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS durometer_shore_a DECIMAL(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS calibration_reference VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS calibrated_at DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS calibration_notes TEXT;

CREATE TABLE IF NOT EXISTS clinical_studies (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title              VARCHAR(255) NOT NULL,
  authors            TEXT,
  publication        VARCHAR(255),
  publication_date   DATE,
  doi                VARCHAR(255),
  source_url         TEXT NOT NULL,
  document_url       TEXT,
  summary            TEXT,
  source_verified    BOOLEAN NOT NULL DEFAULT false,
  is_published       BOOLEAN NOT NULL DEFAULT false,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT clinical_studies_published_requires_verification
    CHECK (is_published = false OR source_verified = true)
);

CREATE INDEX IF NOT EXISTS idx_clinical_studies_published
  ON clinical_studies (publication_date DESC)
  WHERE is_published = true AND source_verified = true;

CREATE TABLE IF NOT EXISTS lab_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key   VARCHAR(120) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description   TEXT,
  updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_fit_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  foot_length_mm    DECIMAL(6,2) CHECK (foot_length_mm IS NULL OR foot_length_mm > 0),
  usual_size        VARCHAR(20),
  arch_preference   VARCHAR(20) CHECK (arch_preference IS NULL OR arch_preference IN ('low','medium','high','unknown')),
  comfort_focus     VARCHAR(30) CHECK (comfort_focus IS NULL OR comfort_focus IN ('heel','arch','forefoot','stability','general')),
  daily_activity    VARCHAR(20) CHECK (daily_activity IS NULL OR daily_activity IN ('low','moderate','high')),
  consent_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','received','refunded')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_return_requests_user ON return_requests(user_id, created_at DESC);
COMMIT;
