# Epic 31 — Lộ trình tự crawl (không FastMoss)

Mục tiêu: **tự thu thập dữ liệu TikTok Shop Việt Nam** (seed URL → crawl → normalize → score → publish ranking), không phụ thuộc FastMoss API.

**Phạm vi thị trường: chỉ `VN`.** Worker, API, UI, seeds và tool analytics đều khóa Việt Nam.

---

## Hiện trạng (đã có)

| Layer | Có gì |
|-------|--------|
| Queue | `tiktok.crawl_jobs` + worker tick (daily cron Hobby) |
| Scraper PDP | `lib/scraper/tiktok-shop.ts` — parse PDP URL, meta/JSON giá, chống captcha flag |
| Generic HTML | `lib/scraper/product-url.ts` |
| oEmbed | video title/author (`lib/fastmoss/crawl.ts`) |
| Ingest | upsert products / metrics / rankings |
| UI | `/trends`, API `/api/tiktok/*` |

**Thiếu:** danh sách URL seed theo category, discovery listing, lịch sử metrics theo ngày, anti-bot ổn định, scoring từ series thật (sales/video growth).

---

## Kiến trúc mục tiêu

```
Seed URLs (manual / shop / affiliate)
        ↓
Discovery jobs  →  product URL queue
        ↓
PDP crawl jobs  →  raw snapshot (Storage) + parse
        ↓
Normalize → tiktok.products + product_metrics_current
        ↓
Daily score  →  opportunity / trend
        ↓
Publish  →  trend_rankings + ranking_items
        ↓
/trends UI + APIs
```

**Nguyên tắc**

1. Mỗi lần fetch lưu snapshot (HTML/JSON) → `crawl_snapshots` (+ Supabase Storage nếu lớn).
2. Parse idempotent; re-parse khi parser version đổi.
3. Không hard phụ thuộc 1 host; có thể đổi nguồn seed.
4. Rate-limit + backoff bắt buộc (TikTok chặn dễ).

---

## Phase C1 — Crawl-first worker ✅

**Đã ship**

- Source `crawl:product-rank` — `lib/trend-intelligence/workers/sources/crawl-product-rank.ts`
- Seed file: `data/tiktok-seeds/vn-beauty.json`
- Enqueue: `pnpm run tiktok:enqueue-seeds -- beauty` (+ `--tick` để chạy ngay)
- API enqueue dùng seeds (không còn FastMoss mặc định)
- AI/FastMoss chỉ khi `ALLOW_AI_ESTIMATE=1`
- Delay 1.5s giữa các PDP; bot block → dùng `title` seed (`seed-hint`)

```bash
pnpm run tiktok:enqueue-seeds -- beauty --tick
# → /trends?category=beauty
```

---

## Phase C2 — Seed catalog theo category ✅

**Đã ship**

- 7 seed files: `data/tiktok-seeds/vn-{beauty,fashion,electronics,home,food,mother-baby,sports}.json` (≥12 SP/category)
- Validate: `pnpm run tiktok:validate-seeds`
- Enqueue all: `pnpm run tiktok:enqueue-seeds -- '*'`
- Daily cron GET tick: nếu queue trống → auto-enqueue all VN seeds → xử lý tới 7 jobs

```bash
pnpm run tiktok:validate-seeds
pnpm run tiktok:enqueue-seeds -- '*'          # enqueue 7 jobs
pnpm run tiktok:enqueue-seeds -- fashion --tick
```

Thay URL placeholder bằng link PDP thật khi có — giữ `title` + `price` cho seed-hint.
---

## Phase C3 — Discovery + anti-bot ✅

**Đã ship**

- Anti-bot: `lib/scraper/fetch-with-backoff.ts` — UA rotation, jitter delay, retry 403/429
- TikTok fetch dùng backoff (`lib/scraper/tiktok-shop.ts`)
- Discovery: source `crawl:shop-listing` + `data/tiktok-seeds/vn-shops.json`
- Extract PDP URLs từ HTML shop → enqueue `crawl:product-rank`
- Snapshots: bucket `tiktok-snapshots` (`005_tiktok_snapshots_bucket.sql`) + fallback `inline://`
- Scripts: `pnpm run tiktok:enqueue-shops [-- --tick]`

```bash
pnpm exec tsx scripts/apply-supabase-migrations.ts 005
pnpm run tiktok:enqueue-shops -- --tick
```

Optional: `CRAWL_PROXY_URL` nếu cần bypass chặt hơn.
---

## Phase C4 — Time-series metrics + scoring ✅

**Đã ship**

- Bảng `tiktok.product_metrics_daily` (`006_product_metrics_daily.sql`)
- Upsert daily mỗi lần ingest (`metricsDailyRepository`)
- Scorer `computeScoresFromDaily` — growth 7d / depth / commission / competition
- Ranking publish theo `opportunity_score` DESC (`publishCategoryRanking`) — không theo thứ tự crawl
- `product_metrics_current` ghi `sales_growth_7d`, `competition_score`, breakdown

```bash
pnpm exec tsx scripts/apply-supabase-migrations.ts 006
pnpm exec tsx scripts/test-compute-scores.ts
pnpm run tiktok:enqueue-seeds -- beauty --tick
```

Cần ≥ 2 ngày crawl cùng product để growth_7d khác null; ngày 1 vẫn score được (baseline + seedRank).

---

## Phase C5 — Productization ✅

**Đã ship**

- Alerts API: `GET/POST/DELETE /api/tiktok/alerts` — rule `opportunity_above`
- Evaluate alerts trong daily tick + admin action `eval-alerts`
- Watchlist refresh: source `crawl:watchlist-refresh` (Pro+ ưu tiên)
- Free tier rate limit 30 mutations/hour (watchlist + alerts)
- Tier limits: watchlist + alerts
- Admin: `/trends/admin` + `GET/POST /api/tiktok/internal/admin/jobs`

```bash
# Daily tick (seeds + watchlist refresh + crawl + eval alerts)
curl -X POST /api/tiktok/internal/crawl/tick \
  -H 'Content-Type: application/json' \
  -d '{"secret":"...","limit":7}'
```

Self-crawl roadmap **C1→C5 hoàn tất** (VN-only).

---

## Lịch đề xuất (solo)

| Tuần | Focus |
|------|--------|
| Tuần 1 | **C1** crawl-first + **C2** seeds 2–3 category |
| Tuần 2 | C2 đủ 7 category + cron ổn định |
| Tuần 3 | **C3** shop discovery + snapshots Storage |
| Tuần 4+ | **C4** daily metrics + scorer |

Hobby limit: **1 cron/ngày** → ưu tiên batch enqueue lớn; refresh on-demand qua `POST .../crawl/tick` khi cần.

---

## Việc không làm (cố ý)

- Không crawl / scrape FastMoss như nguồn chính.
- Không giả lập BXH “thật” bằng LLM rồi gọi là crawl.
- Không BullMQ cho đến khi Postgres queue + cron không đủ.

---

## Bước implement ngay (C1)

1. `lib/trend-intelligence/workers/sources/crawl-product-rank.ts` — crawl URL list.
2. Đổi default enqueue source → `crawl:product-rank`.
3. `data/tiktok-seeds/vn-beauty.json` — 10 URL seed tay.
4. Script enqueue seeds + docs update.
5. Gate AI: chỉ khi không có URL / flag bật.

---

## Tiêu chí xong MVP tự crawl

- [x] `/trends` hiển thị SP từ crawl path (source=`crawl` / `seed-hint`), không AI mặc định
- [x] ≥ 3 category VN có ranking trong ngày (C2: 7 seed sets; chạy `enqueue -- '*'`)
- [x] Job fail không làm sập toàn bộ tick
- [x] Snapshot raw lưu được để debug parser (C3 Storage bucket + inline fallback)
- [x] Docs vận hành: enqueue / tick / kiểm tra ranking

**C1 note:** TikTok Shop thường chặn bot (`Security Check`). Seed cần field `title` (+ optional `price`) để fallback `seed-hint`. Live HTML crawl hoạt động khi không bị captcha — Phase C3 xử lý anti-bot sâu hơn.
