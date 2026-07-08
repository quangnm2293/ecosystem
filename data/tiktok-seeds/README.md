# TikTok seed catalog (Epic 31) — Việt Nam only

Mọi seed file bắt buộc `"region": "VN"`. Platform không crawl thị trường khác.

## Product seeds (C2)

Files: `vn-{beauty,fashion,electronics,home,food,mother-baby,sports}.json`

```bash
pnpm run tiktok:validate-seeds
pnpm run tiktok:enqueue-seeds -- beauty --tick
pnpm run tiktok:enqueue-seeds -- '*'
```

Luôn giữ `title` + `price` — TikTok hay chặn bot → fallback `seed-hint`.

## Shop seeds (C3 discovery)

File: `vn-shops.json`

1. Đổi `shopUrl` thành storefront TikTok thật  
2. Chạy:

```bash
pnpm run tiktok:enqueue-shops -- --tick
```

Job `crawl:shop-listing` extract PDP URLs → enqueue `crawl:product-rank`.

## Optional

- `CRAWL_PROXY_URL` — proxy cho fetch TikTok  
- Storage bucket `tiktok-snapshots` — HTML raw (migration 005)
