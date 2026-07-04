-- Chạy thủ công trên Supabase SQL Editor khi scale (Prisma không quản lý partition)
-- Giai đoạn đầu: bảng analytics_events thường đủ tới ~10M rows với index đúng

-- ─── 1. Monthly partition (khi >5M events/tháng) ───────────────────────────
-- CREATE TABLE analytics_events (
--   LIKE analytics_events INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);
--
-- CREATE TABLE analytics_events_2026_07 PARTITION OF analytics_events
--   FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- BRIN index cho time-range scan rẻ trên partition lớn
-- CREATE INDEX CONCURRENTLY analytics_events_created_brin
--   ON analytics_events USING BRIN (created_at);

-- ─── 2. Daily rollup job (cron: pg_cron trên Supabase hoặc Vercel cron) ────

INSERT INTO content_daily_stats (
  id, content_id, date,
  page_views, unique_visitors, session_starts,
  tool_uses, game_plays,
  affiliate_clicks, ad_impressions, ad_clicks, conversions,
  avg_scroll_depth
)
SELECT
  gen_random_uuid()::text,
  content_id,
  (created_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*) FILTER (WHERE event_type = 'PAGE_VIEW'),
  COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'PAGE_VIEW'),
  COUNT(*) FILTER (WHERE event_type = 'SESSION_START'),
  COUNT(*) FILTER (WHERE event_type = 'TOOL_USED'),
  COUNT(*) FILTER (WHERE event_type = 'GAME_PLAYED'),
  COUNT(*) FILTER (WHERE event_type = 'AFFILIATE_CLICK'),
  COUNT(*) FILTER (WHERE event_type = 'AD_IMPRESSION'),
  COUNT(*) FILTER (WHERE event_type = 'AD_CLICK'),
  COUNT(*) FILTER (WHERE event_type = 'CONVERSION_EVENT'),
  AVG((metadata->>'depth')::float) FILTER (WHERE event_type = 'SCROLL_DEPTH')
FROM analytics_events
WHERE content_id IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND created_at < CURRENT_DATE
GROUP BY content_id, day
ON CONFLICT (content_id, date) DO UPDATE SET
  page_views        = EXCLUDED.page_views,
  unique_visitors   = EXCLUDED.unique_visitors,
  session_starts    = EXCLUDED.session_starts,
  tool_uses         = EXCLUDED.tool_uses,
  game_plays        = EXCLUDED.game_plays,
  affiliate_clicks  = EXCLUDED.affiliate_clicks,
  ad_impressions    = EXCLUDED.ad_impressions,
  ad_clicks         = EXCLUDED.ad_clicks,
  conversions       = EXCLUDED.conversions,
  avg_scroll_depth  = EXCLUDED.avg_scroll_depth;

-- Affiliate rollup
INSERT INTO affiliate_daily_stats (id, affiliate_link_id, date, clicks, conversions, revenue)
SELECT
  gen_random_uuid()::text,
  ae.affiliate_link_id,
  (ae.created_at AT TIME ZONE 'UTC')::date,
  COUNT(*) FILTER (WHERE ae.event_type = 'AFFILIATE_CLICK'),
  COUNT(DISTINCT ac.id),
  COALESCE(SUM(ac.commission), 0)
FROM analytics_events ae
LEFT JOIN affiliate_conversions ac
  ON ac.affiliate_link_id = ae.affiliate_link_id
  AND ac.converted_at::date = (ae.created_at AT TIME ZONE 'UTC')::date
  AND ac.status = 'CONFIRMED'
WHERE ae.affiliate_link_id IS NOT NULL
  AND ae.created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND ae.created_at < CURRENT_DATE
GROUP BY ae.affiliate_link_id, (ae.created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (affiliate_link_id, date) DO UPDATE SET
  clicks      = EXCLUDED.clicks,
  conversions = EXCLUDED.conversions,
  revenue     = EXCLUDED.revenue;

-- ─── 3. Retention helper view ───────────────────────────────────────────────
-- CREATE MATERIALIZED VIEW visitor_cohort_weekly AS
-- SELECT
--   date_trunc('week', first_seen_at) AS cohort_week,
--   COUNT(*) AS cohort_size
-- FROM visitors
-- GROUP BY 1;
