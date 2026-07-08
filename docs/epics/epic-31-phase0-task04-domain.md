# Epic 31 — Phase 0, Task 0.4: Domain Layer

## Scope

TypeScript domain types + value objects cho schema `tiktok.*` — chưa có repository hay API.

**Phụ thuộc:** Task 0.1 migration (`003_tiktok_trend_intelligence.sql`)

## Cấu trúc

```
lib/trend-intelligence/
├── index.ts
└── domain/
    ├── enums.ts          # mirror tiktok_* PostgreSQL enums
    ├── types.ts          # Row (snake_case) + Entity (camelCase)
    ├── mappers.ts        # mapXxx(row) → entity
    ├── index.ts
    └── value-objects/
        ├── region.ts     # ISO region code (VN)
        ├── money.ts      # price_amount + currency
        ├── scores.ts     # opportunity/trend/competition
        └── slug.ts       # kebab-case slug
```

## Usage

```typescript
import { mapProduct, mapProductMetrics, type Product } from '@/lib/trend-intelligence';

const product: Product = mapProduct(row);
```

## Value objects

| VO | Validates |
|----|-----------|
| `Region` | ISO 3166-1 alpha-2 uppercase (`VN`) |
| `Money` | Non-negative integer amount + 3-letter currency |
| `TrendScores` | Scores 0–100, breakdown JSON, calculatedAt |
| `Slug` | Lowercase kebab-case |

## Next task

~~Phase 0, Task 0.7~~ → xem `epic-31-phase0-task07-repositories.md`
