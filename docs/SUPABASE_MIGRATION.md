# Supabase Migration Guide

Chuyển toàn bộ Ecosystem Platform sang **Supabase PostgreSQL + pgvector** làm single source of truth.

---

## 1. Kiến trúc sau migration

```
Next.js App Router
    ↓
/lib/repositories/*  (data access layer)
    ↓
/lib/supabase/admin  (service role — API routes)
/lib/supabase/server (RLS — optional user reads)
    ↓
Supabase PostgreSQL
    ├── contents (+ blog, tools, compare, games, dev)
    ├── content_chunks (+ pgvector + FTS)
    ├── analytics_events
    ├── affiliate_*
    └── tool_result_cache
```

**Removed at runtime:** Prisma client (`lib/db/client` → deprecated re-export)

**Kept for migration only:** `prisma/` folder + `prisma/seed.ts` (export legacy data)

---

## 2. Data mapping (old → new)

| Prisma (camelCase) | Supabase (snake_case) | Notes |
|--------------------|----------------------|-------|
| `Content` | `contents` | Unified content table |
| `contentId` | `content_id` | All FKs snake_case |
| `ContentChunk.embedding` | `content_chunks.embedding vector(1536)` | pgvector |
| `AnalyticsEvent` | `analytics_events` | BIGSERIAL id |
| `AffiliateLink.trackingId` | `affiliate_links.tracking_id` | |
| `ToolResultCache` | `tool_result_cache` | |
| `prisma.$queryRaw` RAG | `rpc('match_content_chunks_semantic')` | |

Enum values unchanged: `BLOG`, `AI_TOOL`, `PAGE_VIEW`, etc.

---

## 3. Migration order (checklist)

### Phase 0 — Supabase project setup
- [ ] Tạo project Supabase
- [ ] Copy `Project URL`, `anon key`, `service_role key`
- [ ] Set env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Phase 1 — Schema
- [x] Run `supabase/migrations/001_ecosystem_schema.sql` in SQL Editor
- [x] Run `supabase/migrations/002_rag_functions.sql`
- [x] Run `supabase/migrations/003_tiktok_trend_intelligence.sql` (Epic 31)
- [x] Run `supabase/migrations/004_expose_tiktok_schema.sql` (PostgREST + grants)
- [x] Verify: `\dx vector` shows extension

**CLI (cần `DATABASE_URL` trong `.env`):**
```bash
pnpm run supabase:migrate          # all migrations
pnpm run supabase:migrate -- 004   # expose tiktok only
```

### Phase 2 — Export existing data (if any)
```bash
# From old Prisma DB
pg_dump $OLD_DATABASE_URL --data-only --table=contents > export_contents.sql
# Transform camelCase → snake_case (script or manual)
```

Or fresh start:
```bash
pnpm run db:seed        # legacy prisma seed (export JSON)
pnpm run supabase:seed  # new Supabase seed (after implementing)
```

### Phase 3 — Import & validate
- [ ] Row counts match: `SELECT count(*) FROM contents`
- [ ] Unique constraints: `type + slug`
- [ ] Sample tool page loads
- [ ] `pnpm run rag:ingest` → chunks populated

### Phase 4 — Switch API layer
- [ ] Deploy Next.js with Supabase env vars
- [ ] Verify: `/api/track`, `/api/tools/execute`, `/api/rag/query`, `/go/:id`
- [ ] Monitor Supabase logs for errors

### Phase 5 — Deprecate old storage
- [ ] Remove `DATABASE_URL` from production (optional: keep for Prisma export only)
- [ ] Remove `prisma generate` from CI build
- [ ] Archive old DB after 7-day validation window

### Rollback strategy
1. Keep old Postgres snapshot 7 days
2. Revert env to `DATABASE_URL` + previous git tag
3. Re-enable Prisma in `package.json` build script
4. No dual-write — migration is cutover, not parallel (simpler for solo dev)

---

## 4. Code layer

### Supabase clients
| File | Use |
|------|-----|
| `lib/supabase/admin.ts` | All API writes (service role) |
| `lib/supabase/server.ts` | Server Components + RLS |
| `lib/supabase/client.ts` | Browser (future auth) |

### Repositories
| Repository | Replaces |
|------------|----------|
| `content.repository.ts` | `prisma.content.*` |
| `analytics.repository.ts` | `prisma.analyticsEvent.*` |
| `affiliate.repository.ts` | `prisma.affiliateLink.*` |
| `rag.repository.ts` | `prisma.$queryRaw` + chunks |
| `tools.repository.ts` | `prisma.toolResultCache.*` |
| `ads.repository.ts` | `prisma.adPlacement.*` |

### Example — content fetch
```typescript
import { contentRepository } from '@/lib/repositories/content.repository';

const post = await contentRepository.findPublishedBySlug('BLOG', 'hello-seo');
```

### Example — track event
```typescript
import { analyticsRepository } from '@/lib/repositories/analytics.repository';

await analyticsRepository.insertEvents([{
  eventType: 'page_view',
  sessionId: '...',
  visitorId: '...',
  path: '/tools/...',
}]);
```

---

## 5. RAG on Supabase pgvector

**Ingest:** `ragRepository.upsertChunk()` → RPC `upsert_content_chunk`

**Search:**
```typescript
const rows = await ragRepository.searchSemantic(embedding, {
  contentTypes: ['AI_TOOL'],
  limit: 20,
});
```

**SQL (cosine similarity):**
```sql
SELECT *, 1 - (embedding <=> $1::vector) AS score
FROM content_chunks
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

Hybrid 70/30 semantic + FTS — see `lib/rag/retrieve.ts`

---

## 6. API routes (unchanged URLs)

| Route | Supabase tables |
|-------|-----------------|
| `POST /api/track` | `analytics_events`, `visitors`, `visitor_sessions` |
| `POST /api/tools/execute` | `tool_result_cache` + registry |
| `POST /api/rag/query` | RPC + LLM |
| `GET /go/:id` | `affiliate_links` + `analytics_events` |
| `POST /api/rag/ingest` | `content_chunks`, `rag_ingest_jobs` |

---

## 7. Performance tuning

### Indexes (in migration)
- `contents(type, status, published_at DESC)` — listings
- `content_chunks` HNSW on `embedding` — vector search
- `content_chunks` GIN on `search_vector` — FTS
- `analytics_events(event_type, created_at DESC)` — dashboards

### Events at scale (>10M rows)
- Partition `analytics_events` by month (manual SQL when needed)
- Dashboard queries → `content_daily_stats` rollups only
- Optional Redis cache (`lib/cache/redis.ts`)

### Connection pooling
- Use Supabase **Transaction pooler** URL for serverless (port 6543)
- Set in `DATABASE_URL` if any tool still needs direct SQL

---

## 8. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server only, never NEXT_PUBLIC

# Optional
OPENAI_API_KEY=...
RAG_INGEST_SECRET=...
```

---

## 9. Safety rules

✅ All API writes → `getSupabaseAdmin()` (service role)  
✅ No Prisma at runtime  
✅ No Pinecone / external vector DB  
✅ Embeddings only in `content_chunks.embedding`  
✅ Single schema for all verticals  

---

## 10. Files reference

```
supabase/migrations/001_ecosystem_schema.sql
supabase/migrations/002_rag_functions.sql
lib/supabase/
lib/repositories/
docs/SUPABASE_MIGRATION.md (this file)
```
