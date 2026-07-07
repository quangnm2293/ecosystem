-- Verification script for 003_tiktok_trend_intelligence.sql
-- Run in Supabase SQL Editor after migration.

-- 1. Schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'tiktok';

-- 2. Core tables (expect 13 rows)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'tiktok'
ORDER BY table_name;

-- 3. Enums
SELECT typname
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND typname LIKE 'tiktok_%'
ORDER BY typname;

-- 4. Seed categories (expect 7)
SELECT slug, name, region
FROM tiktok.categories
WHERE region = 'VN'
ORDER BY slug;

-- 5. FK to public.users
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'tiktok'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- 6. Ranking uniqueness (partial indexes)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'tiktok'
  AND tablename = 'trend_rankings'
ORDER BY indexname;

-- 7. Smoke insert + rollback
BEGIN;

INSERT INTO tiktok.shops (id, tiktok_id, name, region)
VALUES ('shop_test_verify', 'tt_shop_1', 'Verify Shop', 'VN');

INSERT INTO tiktok.products (
  id, tiktok_id, slug, title, shop_id, category_id, region,
  price_amount, commission_rate, last_ingested_at
)
VALUES (
  'prod_test_verify',
  'tt_prod_1',
  'verify-product',
  'Verify Product',
  'shop_test_verify',
  'cat_vn_beauty',
  'VN',
  99000,
  0.15,
  NOW()
);

INSERT INTO tiktok.product_metrics_current (
  product_id, sales_count, video_count, creator_count,
  opportunity_score, trend_score, calculated_at
)
VALUES (
  'prod_test_verify', 100, 10, 5, 75.5, 68.2, NOW()
);

INSERT INTO tiktok.trend_rankings (id, rank_date, region, category_id)
VALUES ('rank_test_verify', CURRENT_DATE, 'VN', 'cat_vn_beauty');

INSERT INTO tiktok.trend_ranking_items (
  id, ranking_id, product_id, rank, opportunity_score, trend_score
)
VALUES (
  'rank_item_test_verify',
  'rank_test_verify',
  'prod_test_verify',
  1,
  75.5,
  68.2
);

SELECT
  p.title,
  m.opportunity_score,
  ri.rank
FROM tiktok.trend_ranking_items ri
JOIN tiktok.products p ON p.id = ri.product_id
JOIN tiktok.product_metrics_current m ON m.product_id = p.id
WHERE ri.id = 'rank_item_test_verify';

ROLLBACK;
