# Ecosystem Platform — Architecture

> Solo-dev friendly. SEO foundation first. Scale hooks sẵn sàng.

## Folder structure

```
ecosystem-platform/
├── app/
│   ├── (public)/          # Homepage
│   ├── (blog)/blog/       # /blog, /blog/[slug]
│   ├── (tools)/tools/     # AI + Dev tools
│   ├── (compare)/compare/
│   ├── (games)/games/
│   ├── api/
│   │   ├── analytics/     # Event ingestion
│   │   └── revalidate/    # On-demand ISR
│   ├── go/[trackingId]/   # Affiliate redirect
│   ├── layout.tsx
│   ├── sitemap.ts
│   └── robots.ts
├── modules/               # Vertical-specific UI (không routing)
│   ├── ai-tools/
│   ├── blog/
│   ├── compare/
│   ├── dev-tools/
│   └── games/
├── lib/
│   ├── config/            # Site constants
│   ├── content/           # Shared content service + page shell
│   ├── db/                # Prisma client
│   ├── seo/               # Metadata + JSON-LD
│   ├── analytics/         # Event persistence
│   ├── tracking/          # Client-side batching
│   ├── affiliate/         # Redirect + tracking
│   ├── ai/                # Multi-provider abstraction
│   ├── ads/               # Ad placement lookup
│   ├── cache/             # Redis hook (memory fallback)
│   └── routing/           # Paths + vertical config
├── components/
│   ├── ads/
│   └── shared/
└── prisma/schema.prisma
```

## Core decisions (tradeoffs)

### 1. Generic `Content` table vs per-vertical tables

**Chọn:** Một bảng `contents` + `metadata` JSON + `ContentType` enum.

| Pros | Cons |
|------|------|
| Thêm vertical mới = thêm enum value + Zod schema, không migrate | Query phức tạp hơn nếu filter theo metadata |
| Một SEO/sitemap/content service cho tất cả | JSON không type-safe ở DB layer |
| Internal linking đồng nhất qua `content_links` | |

**Khi nào tách bảng:** Khi một vertical có >100k rows và query pattern khác hẳn (ví dụ analytics-heavy games leaderboard).

### 2. ISR on-demand vs SSG hàng loạt

**Chọn:** ISR (`revalidate` + `/api/revalidate`) — **không** `generateStaticParams` cho toàn bộ slug.

| Giai đoạn đầu | Scale sau |
|---------------|-----------|
| Pages render khi có request đầu tiên | Sitemap index + chunked sitemaps |
| Webhook revalidate khi publish | Pre-warm top pages via cron |
| Build nhanh, không cần DB lúc build | Edge cache + Redis cho hot content |

### 3. Route groups vs subdomain

**Chọn:** Route groups `(blog)`, `(tools)` — path `/blog/...`, `/tools/...`.

Subdomain (`blog.site.com`) tốt cho brand lớn nhưng tốn effort DNS/SSL/CORS — defer.

### 4. Prisma vs Supabase client

**Chọn:** Prisma + Postgres (Supabase host DB).

Prisma cho migrations/schema rõ ràng; Supabase Auth/Storage thêm sau nếu cần SaaS login.

### 5. Redis optional

**Chọn:** `lib/cache/redis.ts` abstraction — memory Map lúc dev, swap `REDIS_URL` sau.

Không thêm Upstash dependency ngay → ít moving parts.

## Rendering strategy per page type

| Page | Strategy | revalidate | Lý do |
|------|----------|------------|-------|
| Homepage | ISR | default | Ít đổi |
| Blog listing | ISR | 1800s | Content mới thường xuyên |
| Blog post | ISR | 3600s | SEO + freshness balance |
| Tool page | ISR | 86400s | Static UI, tool logic client-side |
| Compare | ISR | 86400s | Affiliate content ổn định |
| Game | ISR | 7d | Asset-heavy, ít đổi |
| Tool usage API | SSR/Dynamic | 0 | Real-time, có thể cần rate limit |
| Affiliate `/go/*` | Dynamic | 0 | Must track click |

## Monetization hooks

1. **Ads:** `AdPlacement` table + `<AdSlot slotKey="..." />` inject ở page shell
2. **Affiliate:** `AffiliateLink` + `/go/{trackingId}` redirect + `AFFILIATE_CLICK` event
3. **SaaS (future):** `ToolMetadata.isPremium` + Supabase Auth gate — chưa implement

## Scaling path (không làm ngay)

1. **10k pages:** Chunked sitemaps `/sitemap/blog.xml`, index tại `/sitemap.xml`
2. **100k+ pages:** Read replica Postgres, Redis cache content by slug, CDN full-page cache
3. **1M+ pages:** Partition `contents` by type, search via Typesense/Meilisearch, background job queue cho sitemap generation

## Next steps (đào sâu)

1. CMS/admin publish flow + seed script
2. MDX pipeline cho blog
3. Concrete AI tool component + rate limiting
4. Chunked sitemap implementation
5. OpenAI provider adapter

Chọn phần muốn đào sâu trước.
