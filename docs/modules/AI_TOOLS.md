# AI Tools Module

Core traffic engine của ecosystem platform.

## Folder structure

```
modules/ai-tools/
├── registry.ts              # 5 tools defined (3 live, 2 soon)
├── types.ts                 # InputField, AiToolDefinition, metadata Zod
├── engine/
│   ├── execute.ts           # Input → prompt → LLM → cache → track
│   └── rate-limit.ts        # 20 req/hour/visitor (env configurable)
├── components/
│   ├── AiToolPage.tsx       # Full page shell
│   ├── ToolRunner.tsx       # Client: form → generate → result
│   ├── DynamicForm.tsx      # Schema-driven form
│   ├── ToolSeoSections.tsx  # How-to, examples, FAQ, related
│   └── AdPlaceholder.tsx    # Client ad slots
└── seo/
    └── json-ld.ts           # FAQ + HowTo schema

app/api/tools/execute/route.ts   # POST execution
app/(tools)/tools/[slug]/page.tsx # SEO page per tool
lib/ai/adapters.ts               # OpenAI + Mock providers
```

## Architecture pattern (reusable cho blog/games/compare)

| Layer | Responsibility |
|-------|----------------|
| **Registry (code)** | Business logic, prompts, input schema — không lưu prompt trong DB |
| **Content (DB)** | SEO copy, publish state, affiliate FK, internal links |
| **Engine** | Generic executor — mọi module AI/game dùng chung pattern |
| **Page** | Server SEO + client interactive shell |

Thêm tool mới = 1 file trong `registry.ts` + seed `contents` row + không đổi engine.

## Monetization placement

| Slot | Vị trí |
|------|--------|
| `tool-top` | Trên form |
| `tool-middle` | Giữa form và result |
| `tool-result` | Trong result card |
| `tool-footer` | Dưới SEO sections (server AdSlot) |

Affiliate CTA trong result card khi `affiliateTrackingId` set → `/go/:id` + tracking.

## Tracking events

| Event | Trigger |
|-------|---------|
| `page_view` | Tool page mount |
| `tool_used` | Successful `/api/tools/execute` |
| `scroll_depth` | Unmount với `time_on_tool_sec` |
| `affiliate_click` | CTA click via `/go/:id` |

## Env

```
OPENAI_API_KEY=sk-...     # Optional — fallback mock AI
AI_PROVIDER=openai
TOOL_RATE_LIMIT_PER_HOUR=20
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...
```

## Live tools

1. AI Blog Writer — `/tools/ai-blog-writer`
2. AI TikTok Script Generator — `/tools/ai-tiktok-script-generator`
3. AI Image Prompt Generator — `/tools/ai-image-prompt-generator`
