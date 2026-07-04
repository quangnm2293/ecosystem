# Ecosystem Platform

Nền tảng đa vertical (AI Tools, Blog, Compare, Games, Dev Tools) — SEO-first, monetization-ready.

## Quick start

```bash
cp .env.example .env
# Cập nhật DATABASE_URL (Supabase Postgres hoặc local)

npm install
npm run db:push      # Tạo tables
npm run db:seed      # Sample content (cần: npm i -D tsx)
npm run dev
```

Chi tiết kiến trúc: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Routes

| Path | Vertical |
|------|----------|
| `/` | Homepage |
| `/blog`, `/blog/[slug]` | Blog / SEO |
| `/tools`, `/tools/[slug]` | AI + Dev tools |
| `/compare`, `/compare/[slug]` | Affiliate compare |
| `/games`, `/games/[slug]` | HTML5 games |
| `/go/[trackingId]` | Affiliate redirect |
| `/api/analytics` | Event tracking |
| `/api/revalidate` | On-demand ISR |
