# Epic 31 — Phase 0, Task 0.7: Repositories

## Scope

Data access layer cho schema `tiktok.*` — đọc catalog/rankings, ghi watchlist/subscription qua service role.

**Phụ thuộc:** Task 0.1 (migration), Task 0.4 (domain)

## Prerequisites

1. Migration `003` applied (`pnpm run supabase:verify-tiktok` → PASS)
2. **Expose schema `tiktok`** — Supabase Dashboard → API Settings → Exposed schemas → thêm `tiktok`

## Repositories

| File | Methods |
|------|---------|
| `category.repository.ts` | `listByRegion`, `findBySlug` |
| `product.repository.ts` | `findActiveBySlug`, `findById`, `listTopByOpportunity` |
| `ranking.repository.ts` | `findLatest`, `listRankedProducts` |
| `watchlist.repository.ts` | `getOrCreateForUser`, `listItems`, `addItem`, `removeItem` |
| `subscription.repository.ts` | `findByUserId`, `getTierForUser` |

## Usage

```typescript
import { categoryRepository, rankingRepository } from '@/lib/trend-intelligence';

const categories = await categoryRepository.listByRegion('VN');
const ranking = await rankingRepository.findLatest({ region: 'VN', categoryId: 'cat_vn_beauty' });
```

## Next task

~~Phase 0 — API routes / worker~~ → xem `epic-31-phase0-api-crawl.md`
