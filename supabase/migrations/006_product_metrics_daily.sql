-- Epic 31 C4 — Daily metrics time-series (VN)
-- Run after 003 + 004

CREATE TABLE IF NOT EXISTS tiktok.product_metrics_daily (
  product_id      TEXT NOT NULL REFERENCES tiktok.products(id) ON DELETE CASCADE,
  day             DATE NOT NULL,
  sales_count     BIGINT NOT NULL DEFAULT 0,
  video_count     INT NOT NULL DEFAULT 0,
  creator_count   INT NOT NULL DEFAULT 0,
  view_count      BIGINT NOT NULL DEFAULT 0,
  price_amount    BIGINT,
  commission_rate REAL,
  source          TEXT,
  raw             JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, day)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_metrics_daily_day
  ON tiktok.product_metrics_daily (day DESC);

CREATE INDEX IF NOT EXISTS idx_tiktok_metrics_daily_product_day
  ON tiktok.product_metrics_daily (product_id, day DESC);

ALTER TABLE tiktok.product_metrics_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tiktok product metrics daily" ON tiktok.product_metrics_daily;
CREATE POLICY "Public read tiktok product metrics daily" ON tiktok.product_metrics_daily
  FOR SELECT USING (true);

GRANT SELECT ON tiktok.product_metrics_daily TO anon, authenticated;
GRANT ALL ON tiktok.product_metrics_daily TO service_role;

NOTIFY pgrst, 'reload schema';
