# Epic 31 — Phase 0: API Routes + Crawl Worker

## API (public)

| Route | Method | Auth |
|-------|--------|------|
| `/api/tiktok/categories?region=VN` | GET | — |
| `/api/tiktok/rankings?region=VN&categorySlug=beauty` | GET | — |
| `/api/tiktok/products/[slug]?region=VN` | GET | — |
| `/api/tiktok/watchlist` | GET/POST/DELETE | Supabase session |

## Internal (worker)

| Route | Method | Auth |
|-------|--------|------|
| `/api/tiktok/internal/crawl/tick` | POST | `CRAWL_WORKER_SECRET` body |
| `/api/tiktok/internal/crawl/tick` | GET | `Authorization: Bearer` (Vercel Cron) |
| `/api/tiktok/internal/crawl/enqueue` | POST | `CRAWL_WORKER_SECRET` |

### Enqueue crawl jobs

```bash
curl -X POST http://localhost:3000/api/tiktok/internal/crawl/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"secret":"YOUR_SECRET","region":"VN","categorySlug":"*"}'
```

`categorySlug: "*"` → enqueue cả 7 danh mục VN.

### Manual tick

```bash
curl -X POST http://localhost:3000/api/tiktok/internal/crawl/tick \
  -H 'Content-Type: application/json' \
  -d '{"secret":"YOUR_SECRET","limit":3}'
```

## Worker flow (C1 crawl-first)

1. `crawlRepository.claimNext()` — Postgres queue (`tiktok.crawl_jobs`)
2. Source `crawl:product-rank` — crawl seed PDP URLs (`data/tiktok-seeds/`)
3. `productIngestRepository.ingestRankedProducts()` — upsert products, metrics, daily ranking
4. Vercel Cron daily (Hobby: 1 lần/ngày) → `GET /api/tiktok/internal/crawl/tick` (02:00 UTC)

```bash
pnpm run tiktok:enqueue-seeds -- beauty --tick
```

## Env

```
CRAWL_WORKER_SECRET=...
CRON_SECRET=...          # optional, Vercel auto-injects on Pro; Hobby dùng CRAWL_WORKER_SECRET
```

## Prerequisites

- [x] Schema `tiktok` exposed (`004_expose_tiktok_schema.sql` + grants)
- `CRAWL_WORKER_SECRET` set on Vercel / `.env`

## UI

| Path | Mô tả |
|------|--------|
| `/trends` | BXH theo category |
| `/trends/products/[slug]` | Chi tiết SP + scores |

## Next

Lộ trình **tự crawl (không FastMoss):** `epic-31-self-crawl-roadmap.md` — bắt đầu Phase **C1** (crawl-first worker + seed URLs).
