-- Example analytics queries — chạy trên Supabase SQL Editor
-- Dashboard nên query content_daily_stats / affiliate_daily_stats, không scan raw events

-- ─── 1. Top pages by traffic (7 ngày) ──────────────────────────────────────
SELECT
  c.type,
  c.slug,
  c.title,
  SUM(cds.page_views)          AS views,
  SUM(cds.unique_visitors)     AS uniques,
  SUM(cds.affiliate_clicks)    AS affiliate_clicks,
  ROUND(
    SUM(cds.affiliate_clicks)::numeric / NULLIF(SUM(cds.page_views), 0) * 100, 2
  ) AS ctr_pct
FROM content_daily_stats cds
JOIN contents c ON c.id = cds.content_id
WHERE cds.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.id, c.type, c.slug, c.title
ORDER BY views DESC
LIMIT 50;

-- ─── 2. Best converting affiliate pages ────────────────────────────────────
SELECT
  c.slug,
  c.title,
  al.label,
  al.tracking_id,
  SUM(ads.clicks)       AS clicks,
  SUM(ads.conversions)  AS conversions,
  SUM(ads.revenue)      AS revenue,
  ROUND(SUM(ads.conversions)::numeric / NULLIF(SUM(ads.clicks), 0) * 100, 2) AS conv_rate_pct
FROM affiliate_daily_stats ads
JOIN affiliate_links al ON al.id = ads.affiliate_link_id
LEFT JOIN contents c ON c.id = al.content_id
WHERE ads.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.slug, c.title, al.id, al.label, al.tracking_id
HAVING SUM(ads.clicks) > 10
ORDER BY conv_rate_pct DESC NULLS LAST, revenue DESC
LIMIT 30;

-- ─── 3. Most used tools ──────────────────────────────────────────────────────
SELECT
  c.slug,
  c.title,
  SUM(cds.tool_uses) AS uses,
  SUM(cds.page_views) AS landing_views,
  ROUND(SUM(cds.tool_uses)::numeric / NULLIF(SUM(cds.page_views), 0) * 100, 2) AS use_rate_pct
FROM content_daily_stats cds
JOIN contents c ON c.id = cds.content_id
WHERE c.type IN ('AI_TOOL', 'DEV_TOOL')
  AND cds.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.slug, c.title
ORDER BY uses DESC
LIMIT 20;

-- ─── 4. User retention (weekly cohort) ───────────────────────────────────────
WITH first_week AS (
  SELECT
    id AS visitor_id,
    date_trunc('week', first_seen_at)::date AS cohort_week
  FROM visitors
),
activity AS (
  SELECT DISTINCT
    visitor_id,
    date_trunc('week', created_at)::date AS active_week
  FROM analytics_events
  WHERE visitor_id IS NOT NULL
    AND event_type = 'PAGE_VIEW'
)
SELECT
  f.cohort_week,
  COUNT(DISTINCT f.visitor_id) AS cohort_size,
  COUNT(DISTINCT a.visitor_id) FILTER (
    WHERE a.active_week = f.cohort_week + INTERVAL '1 week'
  ) AS week_1_retained,
  ROUND(
    COUNT(DISTINCT a.visitor_id) FILTER (
      WHERE a.active_week = f.cohort_week + INTERVAL '1 week'
    )::numeric / NULLIF(COUNT(DISTINCT f.visitor_id), 0) * 100, 1
  ) AS week_1_retention_pct
FROM first_week f
LEFT JOIN activity a ON a.visitor_id = f.visitor_id
WHERE f.cohort_week >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY f.cohort_week
ORDER BY f.cohort_week DESC;

-- ─── 5. Real-time: top pages hôm nay (raw events — chỉ dùng khi traffic thấp) ─
SELECT
  path,
  COUNT(*) AS views,
  COUNT(DISTINCT visitor_id) AS uniques
FROM analytics_events
WHERE event_type = 'PAGE_VIEW'
  AND created_at >= CURRENT_DATE
GROUP BY path
ORDER BY views DESC
LIMIT 20;

-- ─── 6. SEO: pages cần re-index (published nhưng chưa indexed) ─────────────
SELECT id, type, slug, title, published_at, last_indexed_at
FROM contents
WHERE status = 'PUBLISHED'
  AND index_status IN ('PENDING', 'ERROR')
ORDER BY published_at DESC;

-- ─── 7. Page performance (Core Web Vitals median 7 ngày) ───────────────────
SELECT
  c.slug,
  c.title,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY ppm.lcp_ms) AS p75_lcp,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY ppm.cls)    AS p75_cls
FROM page_performance_metrics ppm
JOIN contents c ON c.id = ppm.content_id
WHERE ppm.recorded_at >= NOW() - INTERVAL '7 days'
GROUP BY c.id, c.slug, c.title
HAVING percentile_cont(0.75) WITHIN GROUP (ORDER BY ppm.lcp_ms) > 2500
ORDER BY p75_lcp DESC;
