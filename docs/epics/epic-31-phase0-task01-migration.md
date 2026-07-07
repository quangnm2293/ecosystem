# Epic 31 — Phase 0, Task 0.1: Database Migration

## Scope

Tạo schema PostgreSQL `tiktok.*` cho TikTok Trend Intelligence MVP.

**Không bao gồm task này:**
- ClickHouse (Task 1.8)
- Domain entities / repositories (Task 0.4, 0.7)
- API routes
- Worker / BullMQ

## Migration file

```
supabase/migrations/003_tiktok_trend_intelligence.sql
```

## Apply

### Supabase SQL Editor

1. Mở Supabase Dashboard → SQL Editor
2. Paste nội dung `003_tiktok_trend_intelligence.sql`
3. Run
4. Chạy `scripts/verify-tiktok-schema.sql` để xác nhận

### Local (nếu có `psql`)

```bash
psql "$DATABASE_URL" -f supabase/migrations/003_tiktok_trend_intelligence.sql
psql "$DATABASE_URL" -f scripts/verify-tiktok-schema.sql
```

## Tables

| Table | Purpose |
|-------|---------|
| `tiktok.categories` | Category reference (seed 7 VN categories) |
| `tiktok.shops` | TikTok Shop catalog |
| `tiktok.products` | Product master data |
| `tiktok.product_metrics_current` | Denormalized scores for API read |
| `tiktok.trend_rankings` | Daily published rankings |
| `tiktok.trend_ranking_items` | Ranked products per day |
| `tiktok.subscriptions` | User tier (free/pro/agency/enterprise) |
| `tiktok.watchlists` | User watchlist container |
| `tiktok.watchlist_items` | Watchlist entries |
| `tiktok.alerts` | Alert rules |
| `tiktok.crawl_jobs` | Crawl job queue metadata |
| `tiktok.crawl_snapshots` | Raw snapshot metadata (S3 URL) |
| `tiktok.notification_logs` | Notification delivery audit |

## Dependencies

- `001_ecosystem_schema.sql` — bảng `public.users` (FK)
- `002_rag_functions.sql` — không phụ thuộc trực tiếp

## RLS

- **Public SELECT:** `products` (active), `product_metrics_current`, `trend_rankings`, `trend_ranking_items`, `categories`
- **Writes:** service role (`SUPABASE_SERVICE_ROLE_KEY`) — pattern giống `contents`

## Next task

~~Phase 0, Task 0.4~~ → xem `epic-31-phase0-task04-domain.md`

Sau khi apply migration: expose schema `tiktok` trong Supabase API Settings.
