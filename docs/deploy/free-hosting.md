# Deploy miễn phí — Ecosystem Platform

Stack khuyên dùng (100% free tier):

| Thành phần | Dịch vụ free | Ghi chú |
|------------|--------------|---------|
| Next.js app | [Vercel](https://vercel.com) Hobby | Tối ưu Next.js 16, CDN global |
| Database + Auth | [Supabase](https://supabase.com) Free | PostgreSQL + pgvector |
| AI (tools) | [Groq](https://console.groq.com) Free | `GROQ_API_KEY` |
| AI (backup) | [Google AI Studio](https://aistudio.google.com) | `GEMINI_API_KEY` free quota |

---

## Bước 1 — Supabase (database)

1. Tạo project mới tại [supabase.com/dashboard](https://supabase.com/dashboard)
2. **SQL Editor** → chạy lần lượt:
   - `supabase/migrations/001_ecosystem_schema.sql`
   - `supabase/migrations/002_rag_functions.sql`
3. **Settings → API** → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (chỉ server, không public)
4. **Authentication → Providers → Google** (optional):
   - Redirect URL: `https://YOUR-DOMAIN.vercel.app/auth/callback`
5. Seed dữ liệu (chạy local sau khi có `.env`):

```bash
pnpm run supabase:seed
```

---

## Bước 2 — Deploy Vercel (khuyên dùng)

### Cách A — GitHub (dễ nhất)

1. Push code lên GitHub (`quangnm2293/ecosystem` hoặc fork)
2. [vercel.com/new](https://vercel.com/new) → Import repository
3. **Framework**: Next.js (auto)
4. **Install Command**: `pnpm install`
5. **Build Command**: `pnpm build`
6. Thêm **Environment Variables** (xem bảng bên dưới)
7. Deploy → nhận URL `https://xxx.vercel.app`

### Cách B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.production.local   # hoặc add từng biến trên dashboard
vercel --prod
```

File `vercel.json` đã cấu hình region `sin1` (Singapore, gần VN).

---

## Bước 3 — Biến môi trường production

Copy từ `.env.example`, đặt trên Vercel **Settings → Environment Variables**:

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Cache tools, admin API |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SITE_NAME` | | Tên site |
| `REVALIDATE_SECRET` | ✅ | Random string, bảo vệ `/api/revalidate` |
| `RAG_INGEST_SECRET` | | Bảo vệ `/api/rag/ingest` |
| `GROQ_API_KEY` | Khuyên | AI tools free tier |
| `GEMINI_API_KEY` | Optional | Backup AI + Veo 3 (trả phí) |
| `FASTMOSS_CLIENT_ID/SECRET` | Optional | TikTok analytics API |

Sau khi đổi `NEXT_PUBLIC_SITE_URL`, cập nhật **Supabase Auth redirect URLs**.

---

## Bước 4 — Kiểm tra sau deploy

```bash
# Build local (đã pass = Vercel build OK)
pnpm build

# Smoke test production
curl -sI https://YOUR-APP.vercel.app
curl -s https://YOUR-APP.vercel.app/robots.txt
```

Checklist:

- [ ] Trang chủ `/` load
- [ ] `/tools` và `/tools/ai-tiktok-script-generator` chạy
- [ ] Đăng nhập Google (nếu bật) redirect đúng
- [ ] Tool execute trả kết quả (cần `GROQ_API_KEY`)

---

## Phương án thay thế (free)

### Render.com

- File `render.yaml` đã sẵn sàng
- [dashboard.render.com](https://dashboard.render.com) → **New Blueprint**
- Free tier: service **sleep** sau ~15 phút không traffic (cold start ~30s)

### Cloudflare Pages

- Connect GitHub, build: `pnpm install && pnpm build`
- Output: Next.js cần `@cloudflare/next-on-pages` — chưa cấu hình sẵn; dùng Vercel trước

### Railway / Fly.io

- Có free credit giới hạn; phù hợp khi cần Docker/custom server

---

## Giới hạn free tier cần biết

| Dịch vụ | Giới hạn |
|---------|----------|
| Vercel Hobby | 100GB bandwidth/tháng, serverless timeout |
| Supabase Free | 500MB DB, 50K MAU auth |
| Groq Free | Rate limit theo model |
| Veo 3 video | Trả phí qua Gemini API |

---

## Troubleshooting

**Build fail trên Vercel**

- Đảm bảo `pnpm-lock.yaml` đã commit
- Node 20+: Vercel Settings → Node.js Version = 20.x

**Tool trả lỗi / mock data**

- Thiếu `GROQ_API_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY`

**Auth Google lỗi redirect**

- Supabase → URL Configuration: thêm production URL + `/auth/callback`

**TikTok Shop scrape fail trên server**

- Một số IP datacenter bị captcha; dùng ô mô tả sản phẩm dự phòng trên form
