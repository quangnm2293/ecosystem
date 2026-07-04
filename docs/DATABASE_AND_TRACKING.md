# Database & Tracking System

Thiết kế production-ready cho ecosystem platform: unified content, event analytics, affiliate, ads, SEO metrics.

---

## 1. ERD (text)

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   users     │◄──────│    visitors      │──────►│visitor_     │
│ (Supabase   │       │ (anonymous UUID) │       │sessions     │
│  auth id)   │       └────────┬─────────┘       └──────┬──────┘
└──────┬──────┘                │                        │
       │                       │                        │
       │              ┌────────▼────────────────────────▼──┐
       │              │         analytics_events              │
       │              │  (append-only, BigInt PK, partition)│
       └──────────────┤  event_type, metadata JSON, ts       │
                      └───┬─────────┬──────────┬─────────────┘
                          │         │          │
              ┌───────────▼──┐  ┌───▼────┐  ┌──▼────────────┐
              │   contents   │  │affiliate│  │ ad_placements │
              │ unified multi│  │_links   │  └───────────────┘
              │ -type content│  └───┬────┘
              └──────┬───────┘      │
                     │         ┌────▼─────────────────┐
         ┌───────────▼───┐     │affiliate_conversions│
         │content_daily_ │     └─────────────────────┘
         │stats (rollup) │     ┌─────────────────────┐
         └───────────────┘     │affiliate_daily_stats│
                               └─────────────────────┘

contents ──► content_links (internal linking)
contents ──► page_performance_metrics (Core Web Vitals)
affiliate_links ──► affiliate_programs
```

**Luồng dữ liệu:**
- **Write path (hot):** Client → `/api/track` → `analytics_events` (append-only)
- **Read path (dashboard):** Query `content_daily_stats` / `affiliate_daily_stats` (rollup nightly)
- **Affiliate:** Click → `/go/:id` → event + redirect → conversion webhook → `affiliate_conversions`

---

## 2. Multi-content design

**Chọn: Unified `contents` table (hybrid metadata JSON)**

| Field | Mục đích |
|-------|----------|
| `type` | BLOG, AI_TOOL, DEV_TOOL, GAME, COMPARE |
| `slug`, `title`, `body` | Core content |
| `seo_title`, `seo_description`, `focus_keyword`, `keywords[]` | SEO |
| `sitemap_priority`, `index_status`, `last_indexed_at` | Sitemap & indexing |
| `metadata` JSON | Type-specific (tool config, game embed, compare products) |

**Aggregated metrics** không lưu trên `contents` — lấy từ `content_daily_stats` để tránh write contention.

---

## 3. Event tracking architecture

```
Browser                         API                         PostgreSQL
───────                         ───                         ──────────
useAnalytics() ──batch──► POST /api/track ──► ensure visitor/session
     │                              │              │
     │                              └──────────────► analytics_events
PageViewTracker                     (scale: Redis LPUSH → worker)
ScrollDepthTracker
tool_used (client)
     │
/go/:id click ──────────► GET /go/:trackingId ──► AFFILIATE_CLICK event
                              └── 302 redirect
Affiliate network postback ──► POST /api/conversions ──► affiliate_conversions
```

### Event types

| event_type | Khi nào | metadata ví dụ |
|------------|---------|------------------|
| `session_start` | Tab mới / sessionStorage mới | `referrer`, `utm_*` |
| `page_view` | Route change | `title` |
| `tool_used` | User chạy AI/dev tool | `tool_key`, `input_tokens` |
| `game_played` | Game start / level | `game_key`, `duration_sec` |
| `affiliate_click` | `/go/:id` | `tracking_id`, `program_id` |
| `ad_impression` | Ad slot visible (IntersectionObserver) | `slot_key` |
| `ad_click` | Ad clicked | `slot_key` |
| `scroll_depth` | 25/50/75/100% | `depth` |
| `conversion_event` | Signup, purchase, lead | `goal`, `value` |

### Payload chuẩn (POST /api/track)

```json
{
  "events": [{
    "event_type": "page_view",
    "session_id": "uuid",
    "visitor_id": "uuid",
    "user_id": "optional-supabase-uid",
    "content_id": "cuid",
    "path": "/blog/hello-seo",
    "metadata": { "referrer": "https://google.com" },
    "timestamp": "2026-07-03T10:00:00.000Z"
  }]
}
```

---

## 4. API endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/track` | Batch event ingestion (primary) |
| POST | `/api/analytics` | Alias → `/api/track` |
| GET | `/go/:trackingId` | Public affiliate redirect + click tracking |
| GET | `/api/redirect/:trackingId` | Server-side redirect (same logic) |
| POST | `/api/conversions` | *(TODO)* Affiliate postback webhook |
| POST | `/api/revalidate` | ISR after publish |

### Affiliate redirect flow

1. UI: `<Link href="/go/demo-a?sid=...&vid=...&from=/compare/...">`
2. Server: lookup `affiliate_links.tracking_id`
3. Insert `AFFILIATE_CLICK` vào `analytics_events`
4. Append `sub_id=trackingId` vào destination URL
5. 302 redirect

### Conversion webhook (design)

```json
POST /api/conversions
Authorization: Bearer {AFFILIATE_WEBHOOK_SECRET}
{
  "tracking_id": "demo-a",
  "transaction_id": "txn_123",
  "revenue": 49.99,
  "commission": 5.00,
  "currency": "USD",
  "status": "confirmed"
}
```

→ Upsert `affiliate_conversions` + emit `CONVERSION_EVENT`.

---

## 5. SEO system support

| Table / field | Vai trò |
|---------------|---------|
| `contents.index_status` | PENDING → INDEXED (sync Search Console) |
| `contents.sitemap_priority` | Per-URL priority trong sitemap |
| `content_daily_stats.page_views` | Traffic signal cho internal linking weight |
| `page_performance_metrics` | LCP/FID/CLS — identify slow pages |

Sitemap generation: query `contents WHERE status=PUBLISHED AND index_status != NOINDEX`.

---

## 6. SQL queries

Xem file: `prisma/sql/analytics_queries.sql`

- Top pages by traffic
- Best converting affiliate pages
- Most used tools
- Weekly retention cohorts
- SEO re-index candidates
- Core Web Vitals p75

Rollup job: `prisma/sql/rollups_and_partitions.sql` (chạy nightly via pg_cron).

---

## 7. Scaling (millions of events/day)

| Giai đoạn | Volume | Chiến lược |
|-----------|--------|------------|
| **MVP** | <100K/day | Single `analytics_events` + indexes, batch insert 20/event |
| **Growth** | 100K–1M/day | Redis buffer → worker flush; nightly rollups bắt buộc |
| **Scale** | 1M–10M/day | Monthly partitions; BRIN index; archive >90d to cold storage |
| **High scale** | 10M+/day | TimescaleDB / ClickHouse for analytics; Postgres chỉ rollups |

**Rules:**
1. Dashboard **không** scan raw events — chỉ `*_daily_stats`
2. `analytics_events.id` = BigInt autoincrement (tránh CUID overhead)
3. Partition by `created_at` month khi table >50GB
4. Supabase: enable connection pooling (PgBouncer), read replica cho analytics queries
5. Optional Redis: `LPUSH track:buffer` → cron flush `createMany` 500 rows/batch

**Retention policy (suggested):**
- Raw events: 90 days hot → archive parquet/S3
- Daily stats: forever
- Sessions: 30 days detail, aggregate to visitor cohorts

---

## 8. Files trong repo

| File | Vai trò |
|------|---------|
| `prisma/schema.prisma` | Full schema |
| `lib/analytics/schemas.ts` | Zod validation |
| `lib/analytics/events.ts` | Persist + identity upsert |
| `lib/tracking/client.ts` | Browser batching |
| `app/api/track/route.ts` | Ingestion endpoint |
| `prisma/sql/analytics_queries.sql` | Example queries |
| `prisma/sql/rollups_and_partitions.sql` | Cron jobs + partition template |

```bash
npm run db:push    # Apply schema
npm run db:seed    # Sample data
```
