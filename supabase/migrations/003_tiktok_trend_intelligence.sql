-- Epic 31 — TikTok Trend Intelligence (Phase 0, Task 0.1)
-- Operational schema for product catalog, scores, rankings, watchlists, crawl jobs.
-- Run after 001_ecosystem_schema.sql and 002_rag_functions.sql

CREATE SCHEMA IF NOT EXISTS tiktok;

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE tiktok_product_status AS ENUM ('ACTIVE', 'DELISTED', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tiktok_crawl_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tiktok_alert_status AS ENUM ('ACTIVE', 'PAUSED', 'TRIGGERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tiktok_subscription_tier AS ENUM ('FREE', 'PRO', 'AGENCY', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tiktok_subscription_status AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tiktok_notification_status AS ENUM ('SENT', 'DELIVERED', 'FAILED', 'BOUNCED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Reference data ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tiktok.categories (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL,
  name       TEXT NOT NULL,
  parent_id  TEXT REFERENCES tiktok.categories(id) ON DELETE SET NULL,
  region     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slug, region)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_categories_parent
  ON tiktok.categories (parent_id);

CREATE TABLE IF NOT EXISTS tiktok.shops (
  id         TEXT PRIMARY KEY,
  tiktok_id  TEXT UNIQUE,
  name       TEXT NOT NULL,
  region     TEXT NOT NULL DEFAULT 'VN',
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_shops_region
  ON tiktok.shops (region);

-- ─── Product catalog ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tiktok.products (
  id                TEXT PRIMARY KEY,
  tiktok_id         TEXT NOT NULL,
  slug              TEXT NOT NULL,
  title             TEXT NOT NULL,
  image_url         TEXT,
  product_url       TEXT,
  shop_id           TEXT REFERENCES tiktok.shops(id) ON DELETE SET NULL,
  category_id       TEXT REFERENCES tiktok.categories(id) ON DELETE SET NULL,
  region            TEXT NOT NULL DEFAULT 'VN',
  price_amount      BIGINT,
  price_currency    TEXT NOT NULL DEFAULT 'VND',
  commission_rate   REAL,
  commission_type   TEXT,
  status            tiktok_product_status NOT NULL DEFAULT 'ACTIVE',
  metadata          JSONB NOT NULL DEFAULT '{}',
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_ingested_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tiktok_id),
  UNIQUE (region, slug)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_products_region_category
  ON tiktok.products (region, category_id);

CREATE INDEX IF NOT EXISTS idx_tiktok_products_status_ingested
  ON tiktok.products (status, last_ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_tiktok_products_shop
  ON tiktok.products (shop_id);

-- Denormalized current metrics + scores (fast read path for API)
CREATE TABLE IF NOT EXISTS tiktok.product_metrics_current (
  product_id          TEXT PRIMARY KEY REFERENCES tiktok.products(id) ON DELETE CASCADE,
  sales_count         BIGINT NOT NULL DEFAULT 0,
  sales_growth_7d     REAL,
  video_count         INT NOT NULL DEFAULT 0,
  video_growth_7d     REAL,
  creator_count       INT NOT NULL DEFAULT 0,
  creator_growth_7d   REAL,
  view_count          BIGINT NOT NULL DEFAULT 0,
  avg_commission      REAL,
  competition_score   REAL,
  trend_score         REAL,
  opportunity_score   REAL,
  score_breakdown     JSONB NOT NULL DEFAULT '{}',
  prediction_label    TEXT,
  prediction_confidence REAL,
  calculated_at       TIMESTAMPTZ NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_metrics_opportunity
  ON tiktok.product_metrics_current (opportunity_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tiktok_metrics_trend
  ON tiktok.product_metrics_current (trend_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tiktok_metrics_calculated
  ON tiktok.product_metrics_current (calculated_at DESC);

-- ─── Daily rankings (immutable once published) ───────────────────────────────

CREATE TABLE IF NOT EXISTS tiktok.trend_rankings (
  id           TEXT PRIMARY KEY,
  rank_date    DATE NOT NULL,
  region       TEXT NOT NULL,
  category_id  TEXT REFERENCES tiktok.categories(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tiktok_rankings_date_region_all
  ON tiktok.trend_rankings (rank_date, region)
  WHERE category_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tiktok_rankings_date_region_category
  ON tiktok.trend_rankings (rank_date, region, category_id)
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tiktok_rankings_published
  ON tiktok.trend_rankings (published_at DESC);

CREATE TABLE IF NOT EXISTS tiktok.trend_ranking_items (
  id                TEXT PRIMARY KEY,
  ranking_id        TEXT NOT NULL REFERENCES tiktok.trend_rankings(id) ON DELETE CASCADE,
  product_id        TEXT NOT NULL REFERENCES tiktok.products(id) ON DELETE CASCADE,
  rank              INT NOT NULL CHECK (rank > 0),
  opportunity_score REAL NOT NULL,
  trend_score       REAL NOT NULL,
  score_breakdown   JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ranking_id, rank),
  UNIQUE (ranking_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_ranking_items_rank
  ON tiktok.trend_ranking_items (ranking_id, rank);

CREATE INDEX IF NOT EXISTS idx_tiktok_ranking_items_product
  ON tiktok.trend_ranking_items (product_id);

-- ─── User features (FK → public.users from 001) ────────────────────────────────

CREATE TABLE IF NOT EXISTS tiktok.subscriptions (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier                   tiktok_subscription_tier NOT NULL DEFAULT 'FREE',
  status                 tiktok_subscription_status NOT NULL DEFAULT 'ACTIVE',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  metadata               JSONB NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_subscriptions_tier
  ON tiktok.subscriptions (tier, status);

CREATE TABLE IF NOT EXISTS tiktok.watchlists (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS tiktok.watchlist_items (
  id           TEXT PRIMARY KEY,
  watchlist_id TEXT NOT NULL REFERENCES tiktok.watchlists(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL REFERENCES tiktok.products(id) ON DELETE CASCADE,
  notes        TEXT,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_watchlist_items_product
  ON tiktok.watchlist_items (product_id);

CREATE TABLE IF NOT EXISTS tiktok.alerts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_type       TEXT NOT NULL,
  rule_params     JSONB NOT NULL DEFAULT '{}',
  channels        TEXT[] NOT NULL DEFAULT '{}',
  channel_config  JSONB NOT NULL DEFAULT '{}',
  status          tiktok_alert_status NOT NULL DEFAULT 'ACTIVE',
  last_triggered  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_alerts_user_status
  ON tiktok.alerts (user_id, status);

CREATE INDEX IF NOT EXISTS idx_tiktok_alerts_active
  ON tiktok.alerts (status, created_at DESC)
  WHERE status = 'ACTIVE';

-- ─── Crawl pipeline ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tiktok.crawl_jobs (
  id               TEXT PRIMARY KEY,
  source           TEXT NOT NULL,
  params           JSONB NOT NULL DEFAULT '{}',
  status           tiktok_crawl_status NOT NULL DEFAULT 'PENDING',
  attempts         INT NOT NULL DEFAULT 0,
  max_attempts     INT NOT NULL DEFAULT 3,
  raw_snapshot_url TEXT,
  error_message    TEXT,
  parser_version   TEXT,
  scheduled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_crawl_jobs_pending
  ON tiktok.crawl_jobs (status, scheduled_at)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_tiktok_crawl_jobs_source_created
  ON tiktok.crawl_jobs (source, created_at DESC);

CREATE TABLE IF NOT EXISTS tiktok.crawl_snapshots (
  id          TEXT PRIMARY KEY,
  job_id      TEXT REFERENCES tiktok.crawl_jobs(id) ON DELETE SET NULL,
  source      TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  size_bytes  BIGINT,
  parsed      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_crawl_snapshots_job
  ON tiktok.crawl_snapshots (job_id);

CREATE INDEX IF NOT EXISTS idx_tiktok_crawl_snapshots_unparsed
  ON tiktok.crawl_snapshots (parsed, created_at DESC)
  WHERE parsed = FALSE;

-- ─── Notifications ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tiktok.notification_logs (
  id         TEXT PRIMARY KEY,
  alert_id   TEXT REFERENCES tiktok.alerts(id) ON DELETE SET NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,
  status     tiktok_notification_status NOT NULL DEFAULT 'SENT',
  payload    JSONB NOT NULL DEFAULT '{}',
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_notification_logs_user
  ON tiktok.notification_logs (user_id, sent_at DESC);

-- ─── Seed: default VN categories (idempotent) ───────────────────────────────

INSERT INTO tiktok.categories (id, slug, name, region)
VALUES
  ('cat_vn_beauty', 'beauty', 'Làm đẹp & Chăm sóc cá nhân', 'VN'),
  ('cat_vn_fashion', 'fashion', 'Thời trang', 'VN'),
  ('cat_vn_electronics', 'electronics', 'Điện tử', 'VN'),
  ('cat_vn_home', 'home', 'Nhà cửa & Đời sống', 'VN'),
  ('cat_vn_food', 'food', 'Thực phẩm', 'VN'),
  ('cat_vn_mother_baby', 'mother-baby', 'Mẹ & Bé', 'VN'),
  ('cat_vn_sports', 'sports', 'Thể thao', 'VN')
ON CONFLICT (slug, region) DO NOTHING;

-- ─── RLS: public read for catalog/rankings; user tables via service role ─────

ALTER TABLE tiktok.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active tiktok products" ON tiktok.products;
CREATE POLICY "Public read active tiktok products" ON tiktok.products
  FOR SELECT USING (status = 'ACTIVE');

ALTER TABLE tiktok.product_metrics_current ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tiktok product metrics" ON tiktok.product_metrics_current;
CREATE POLICY "Public read tiktok product metrics" ON tiktok.product_metrics_current
  FOR SELECT USING (true);

ALTER TABLE tiktok.trend_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tiktok trend rankings" ON tiktok.trend_rankings;
CREATE POLICY "Public read tiktok trend rankings" ON tiktok.trend_rankings
  FOR SELECT USING (true);

ALTER TABLE tiktok.trend_ranking_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tiktok trend ranking items" ON tiktok.trend_ranking_items;
CREATE POLICY "Public read tiktok trend ranking items" ON tiktok.trend_ranking_items
  FOR SELECT USING (true);

ALTER TABLE tiktok.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tiktok categories" ON tiktok.categories;
CREATE POLICY "Public read tiktok categories" ON tiktok.categories
  FOR SELECT USING (true);

-- Writes: service role only (Next.js API / worker)
