-- ============================================================
-- D2C Footwear Brand - Database Schema (Neon / PostgreSQL 14+)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
  is_verified   BOOLEAN DEFAULT false,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        VARCHAR(50) DEFAULT 'Home',
  full_name    VARCHAR(200) NOT NULL,
  phone        VARCHAR(20),
  line1        VARCHAR(255) NOT NULL,
  line2        VARCHAR(255),
  city         VARCHAR(100) NOT NULL,
  state        VARCHAR(100) NOT NULL,
  postal_code  VARCHAR(20) NOT NULL,
  country      VARCHAR(100) DEFAULT 'India',
  is_default   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT true,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) UNIQUE NOT NULL,
  description       TEXT,
  short_description VARCHAR(500),
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand             VARCHAR(100) DEFAULT 'StepUp',
  base_price        DECIMAL(10,2) NOT NULL,
  sale_price        DECIMAL(10,2),
  cost_price        DECIMAL(10,2),
  sku               VARCHAR(100) UNIQUE,
  material          VARCHAR(255),
  care_instructions TEXT,
  arch_support_level VARCHAR(20),
  arch_height_mm DECIMAL(5,2),
  durometer_shore_a DECIMAL(5,2),
  calibration_reference VARCHAR(255),
  calibrated_at DATE,
  calibration_notes TEXT,
  is_active         BOOLEAN DEFAULT true,
  is_featured       BOOLEAN DEFAULT false,
  is_new_arrival    BOOLEAN DEFAULT false,
  is_bestseller     BOOLEAN DEFAULT false,
  tags              TEXT[],
  meta_title        VARCHAR(255),
  meta_description  TEXT,
  avg_rating        DECIMAL(3,2) DEFAULT 0,
  review_count      INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Additive product-fit metadata for existing installations.
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

CREATE TABLE IF NOT EXISTS store_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key   VARCHAR(120) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description   TEXT,
  updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Preserve the current checkout defaults as initial database values.
-- ON CONFLICT keeps any company-managed settings intact on later migrations.
INSERT INTO store_settings (setting_key, setting_value, description)
VALUES (
  'checkout_pricing',
  '{"free_shipping_threshold_inr":599,"shipping_fee_inr":99,"gst_rate_percent":5}'::jsonb,
  'Checkout shipping threshold, shipping fee and GST rate. Applies to new orders.'
)
ON CONFLICT (setting_key) DO NOTHING;

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

CREATE TABLE IF NOT EXISTS product_variants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size       VARCHAR(20) NOT NULL,
  color      VARCHAR(50) NOT NULL,
  color_hex  VARCHAR(10),
  stock_qty  INT DEFAULT 0,
  sku        VARCHAR(150) UNIQUE,
  price_adj  DECIMAL(10,2) DEFAULT 0,
  weight_g   INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  url        TEXT NOT NULL,
  alt_text   VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(50) UNIQUE NOT NULL,
  description      TEXT,
  discount_type    VARCHAR(20) CHECK (discount_type IN ('percentage','fixed')),
  discount_value   DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses         INT,
  used_count       INT DEFAULT 0,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  valid_from       TIMESTAMPTZ DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id    UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      VARCHAR(50) UNIQUE NOT NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(30) DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','refunded','returned')),
  subtotal          DECIMAL(10,2) NOT NULL,
  discount_amount   DECIMAL(10,2) DEFAULT 0,
  shipping_amount   DECIMAL(10,2) DEFAULT 0,
  tax_amount        DECIMAL(10,2) DEFAULT 0,
  total_amount      DECIMAL(10,2) NOT NULL,
  coupon_id         UUID REFERENCES coupons(id) ON DELETE SET NULL,
  shipping_address  JSONB NOT NULL,
  billing_address   JSONB,
  payment_status    VARCHAR(30) DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method    VARCHAR(50),
  payment_intent_id VARCHAR(255),
  tracking_number   VARCHAR(100),
  notes             TEXT,
  estimated_delivery DATE,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id   UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  size         VARCHAR(20) NOT NULL,
  color        VARCHAR(50) NOT NULL,
  quantity     INT NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  total_price  DECIMAL(10,2) NOT NULL,
  image_url    TEXT
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     VARCHAR(30) NOT NULL,
  note       TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         VARCHAR(255),
  body          TEXT,
  is_verified   BOOLEAN DEFAULT false,
  is_approved   BOOLEAN DEFAULT true,
  helpful_count INT DEFAULT 0,
  images        TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
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

CREATE TABLE IF NOT EXISTS inventory_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  change_qty INT NOT NULL,
  reason     VARCHAR(100),
  reference  VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug      ON products(slug);
CREATE INDEX IF NOT EXISTS idx_variants_product   ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_images_product     ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product    ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart    ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user      ON wishlist_items(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at') THEN
    CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
    CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_carts_updated_at') THEN
    CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
