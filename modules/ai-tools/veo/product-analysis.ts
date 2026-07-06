import { z } from 'zod';
import { freeLlmComplete, isFreeLlmConfigured } from '@/lib/ai/free-llm';
import type { ProductPageData } from '@/lib/scraper/product-url';

export const ProductHookAngleSchema = z.object({
  angle: z.string(),
  rationale: z.string(),
  sampleHook: z.string(),
});

export const ProductInsightsSchema = z.object({
  productSummary: z.string(),
  category: z.string().optional(),
  targetAudience: z.string().optional(),
  painPoints: z.array(z.string()).min(1).max(5),
  benefits: z.array(z.string()).min(1).max(6),
  uniqueSellingPoints: z.array(z.string()).min(1).max(6),
  keywords: z.array(z.string()).max(10).default([]),
  hookAngles: z.array(ProductHookAngleSchema).min(2).max(6),
});

export type ProductInsights = z.infer<typeof ProductInsightsSchema>;

const ANALYSIS_SYSTEM = `Bạn là chuyên gia phân tích sản phẩm TikTok Shop cho video affiliate.
Đọc dữ liệu trang sản phẩm và trả về ĐÚNG MỘT JSON object (không markdown):
{
  "productSummary": string (1-2 câu tóm tắt sản phẩm từ mô tả thực tế),
  "category": string (ngành hàng / loại sản phẩm),
  "targetAudience": string (đối tượng mua phù hợp),
  "painPoints": string[] (2-4 nỗi đau / nhu cầu khách hàng — suy luận từ mô tả, không bịa),
  "benefits": string[] (3-5 lợi ích CỤ THỂ từ mô tả sản phẩm),
  "uniqueSellingPoints": string[] (2-4 USP nổi bật, trích từ mô tả),
  "keywords": string[] (từ khóa sản phẩm),
  "hookAngles": [{
    "angle": string (góc hook: tò mò / đau điểm / social proof / ...),
    "rationale": string (vì sao góc này phù hợp sản phẩm này),
    "sampleHook": string (câu hook mẫu 0-3s, nhắc tính năng/lợi ích cụ thể)
  }]
}
Quy tắc:
- CHỈ dùng thông tin từ dữ liệu đầu vào. Không bịa giá, %, số liệu, cam kết y tế.
- sampleHook và benefits phải nhắc chi tiết từ mô tả (chất liệu, công dụng, đối tượng...).
- hookAngles phải đa dạng: tò mò, đau điểm, gây sốc nhẹ, câu hỏi, storytelling.`;

function parseJsonFromLlm(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?\n•·|]+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 12)
    .slice(0, 8);
}

/** Phân tích heuristic khi không có LLM hoặc parse lỗi */
export function heuristicProductInsights(page: ProductPageData, language: string): ProductInsights {
  const title = page.title?.trim() || 'Sản phẩm TikTok Shop';
  const desc = (page.description ?? page.textSnippet).trim();
  const sentences = splitSentences(desc);
  const summary = desc.slice(0, 220) || title;

  const benefits =
    sentences.length >= 2
      ? sentences.slice(0, 4)
      : [desc.slice(0, 100) || `${title} — tiện lợi cho nhu cầu hàng ngày`];

  const painPoints =
    sentences.length >= 3
      ? [sentences[0], `Khó tìm sản phẩm ${title} chất lượng, giá hợp lý`]
      : [`Nhiều người chưa biết ${title} giải quyết vấn đề gì`];

  const keywords = [...new Set([title, ...title.split(/\s+/), ...benefits[0]?.split(/\s+/).slice(0, 4) ?? []])]
    .filter((w) => w.length > 2)
    .slice(0, 8);

  const benefitSnippet = benefits[0]?.slice(0, 60) ?? title;
  const vi = language !== 'en';

  const hookAngles: ProductInsights['hookAngles'] = [
    {
      angle: vi ? 'Tò mò' : 'Curiosity',
      rationale: vi ? `Khai thác lợi ích "${benefitSnippet}"` : `Leverage benefit "${benefitSnippet}"`,
      sampleHook: vi
        ? `Sao ${title} lại được khen vì ${benefitSnippet}?`
        : `Why is everyone buying ${title} for ${benefitSnippet}?`,
    },
    {
      angle: vi ? 'Đau điểm' : 'Pain point',
      rationale: vi ? 'Gắn nhu cầu thực tế của khách' : 'Connect to real customer need',
      sampleHook: vi
        ? `${painPoints[0]} — ${title} có thể giúp`
        : `${painPoints[0]} — ${title} might help`,
    },
    {
      angle: vi ? 'Social proof' : 'Social proof',
      rationale: vi ? 'Sản phẩm đang hot TikTok Shop' : 'Trending on TikTok Shop',
      sampleHook: vi
        ? `${title} đang viral — mình test ${benefitSnippet}`
        : `${title} is trending — I tested ${benefitSnippet}`,
    },
  ];

  return {
    productSummary: summary,
    category: 'TikTok Shop',
    targetAudience: vi ? 'Người mua online 18-35' : 'Online shoppers 18-35',
    painPoints,
    benefits,
    uniqueSellingPoints: [title, ...benefits.slice(0, 2)],
    keywords,
    hookAngles,
  };
}

function buildAnalysisUserPrompt(page: ProductPageData, language: string): string {
  const langLabel = language === 'en' ? 'English' : 'Tiếng Việt';
  const sourceNote =
    page.source === 'tiktok-shop-pdp'
      ? 'Dữ liệu lấy từ TikTok Shop PDP (tin cậy).'
      : page.source === 'user-hint'
        ? 'Dữ liệu chủ yếu từ mô tả người dùng.'
        : 'Dữ liệu crawl trang web.';

  return `Phân tích sản phẩm để viết hook TikTok affiliate.
- Ngôn ngữ sampleHook: ${langLabel}
- ${sourceNote}
- BẮT BUỘC: hookAngles và benefits phải nhắc đúng loại sản phẩm (tên, tính năng) từ mô tả bên dưới.

Dữ liệu trang:
- URL: ${page.url}
- Tiêu đề: ${page.title ?? 'N/A'}
- Meta mô tả: ${page.description ?? 'N/A'}
- Giá (nếu có): ${page.price ?? 'N/A'}
${page.productId ? `- Product ID: ${page.productId}` : ''}

Nội dung sản phẩm:
${page.textSnippet.slice(0, 4500)}`;
}

/** Bước 1: AI phân tích sản phẩm từ mô tả thực tế */
export async function analyzeProductForHooks(
  page: ProductPageData,
  language: string,
): Promise<ProductInsights> {
  if (!isFreeLlmConfigured()) {
    return heuristicProductInsights(page, language);
  }

  try {
    const raw = await freeLlmComplete(
      [
        { role: 'system', content: ANALYSIS_SYSTEM },
        { role: 'user', content: buildAnalysisUserPrompt(page, language) },
      ],
      { temperature: 0.4, maxTokens: 1800, jsonMode: true },
    );
    return ProductInsightsSchema.parse(parseJsonFromLlm(raw));
  } catch {
    return heuristicProductInsights(page, language);
  }
}

export function insightsToSellingPoints(insights: ProductInsights): string[] {
  const merged = [...insights.uniqueSellingPoints, ...insights.benefits];
  return [...new Set(merged.map((s) => s.trim()).filter(Boolean))].slice(0, 6);
}

export function formatInsightsForScriptPrompt(insights: ProductInsights, language: string): string {
  const langLabel = language === 'en' ? 'English' : 'Tiếng Việt';
  const hooks = insights.hookAngles
    .map((h, i) => `  ${i + 1}. [${h.angle}] ${h.sampleHook}\n     → ${h.rationale}`)
    .join('\n');

  return `## Phân tích AI sản phẩm (BẮT BUỘC dùng cho hook & script)
- Tóm tắt: ${insights.productSummary}
- Ngành: ${insights.category ?? 'N/A'}
- Đối tượng: ${insights.targetAudience ?? 'N/A'}
- Nỗi đau: ${insights.painPoints.join(' | ')}
- Lợi ích: ${insights.benefits.join(' | ')}
- USP: ${insights.uniqueSellingPoints.join(' | ')}
- Từ khóa: ${insights.keywords.join(', ')}

Góc hook đề xuất (mỗi scenario nên bám 1 góc, hook phải nhắc chi tiết sản phẩm):
${hooks}

Yêu cầu: hook, voiceover, visual, caption phải ${langLabel}, có từ khóa/tính năng CỤ THỂ từ phân tích trên — KHÔNG dùng câu generic.`;
}

export function pickHookForStyle(
  styleKey: string,
  insights: ProductInsights,
  language: string,
  index: number,
): string {
  const vi = language !== 'en';
  const benefit = insights.benefits[index % insights.benefits.length] ?? insights.productSummary;
  const pain = insights.painPoints[index % insights.painPoints.length];
  const usp = insights.uniqueSellingPoints[0] ?? benefit;
  const fromAngle = insights.hookAngles[index % insights.hookAngles.length]?.sampleHook;

  if (fromAngle && fromAngle.length > 12) return fromAngle;

  const shortBenefit = benefit.slice(0, 55);

  const templates: Record<string, { vi: string; en: string }> = {
    'hook-attention': {
      vi: `Dừng scroll! ${usp} — ${shortBenefit}`,
      en: `Stop scrolling! ${usp} — ${shortBenefit}`,
    },
    'hook-curiosity': {
      vi: `99% chưa biết ${usp} có ${shortBenefit}`,
      en: `Most people don't know ${usp} does ${shortBenefit}`,
    },
    'hook-shock': {
      vi: `Không ngờ ${usp} lại ${shortBenefit}`,
      en: `I can't believe ${usp} actually ${shortBenefit}`,
    },
    'hook-question': {
      vi: `Tại sao ${usp} hot vì ${shortBenefit}?`,
      en: `Why is ${usp} trending for ${shortBenefit}?`,
    },
    'hook-story': {
      vi: `Mình thử ${usp} vì ${pain} — kết quả...`,
      en: `I tried ${usp} because ${pain} — here's what happened`,
    },
    'hook-social-proof': {
      vi: `${usp} đang bán chạy — ${shortBenefit}`,
      en: `${usp} is selling out — ${shortBenefit}`,
    },
  };

  const t = templates[styleKey];
  if (t) return vi ? t.vi : t.en;

  return vi ? `${usp}: ${shortBenefit}` : `${usp}: ${shortBenefit}`;
}
