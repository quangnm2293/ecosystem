import { freeLlmComplete, isFreeLlmConfigured, resolveFreeLlmLabel } from '@/lib/ai/free-llm';
import { fetchProductPageData } from '@/lib/scraper/product-url';
import {
  normalizeSceneDurations,
  parseVideoPlanJson,
  planToMarkdown,
  type VideoPlan,
} from '@/modules/ai-tools/video/plan';
import { generateAffiliateVideoWithVeo, isClipOnlyMode, resolveScriptDuration } from '@/modules/ai-tools/video/veo-generate';
import type { ToolCustomResult } from '@/modules/ai-tools/types';

const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  th: 'ภาษาไทย',
  id: 'Bahasa Indonesia',
};

const PLAN_SYSTEM = `Bạn là chuyên gia TikTok affiliate video.
Trả về ĐÚNG MỘT JSON object (không markdown) với schema:
{
  "productTitle": string,
  "sellingPoints": string[] (3-5 items),
  "scenes": [{ "durationSec": number, "onScreenText": string, "voiceover": string }],
  "caption": string,
  "hashtags": string[],
  "ctaAffiliate": string
}
Quy tắc: hook mạnh ở scene đầu; onScreenText ngắn (<=12 từ); tổng durationSec scenes = thời lượng yêu cầu; không bịa giá/số liệu.`;

function mockPlan(productTitle: string, duration: number): VideoPlan {
  const hook = Math.min(4, Math.floor(duration * 0.15));
  const body = Math.max(6, duration - hook - 5);
  const cta = duration - hook - body;

  return {
    productTitle,
    sellingPoints: [
      'Giải quyết nhu cầu nhanh — demo trực quan',
      'Giá trị nổi bật so với sản phẩm thường',
      'Phù hợp đối tượng mua online',
    ],
    scenes: [
      {
        durationSec: hook,
        onScreenText: 'ĐỪNG scroll nếu chưa xem!',
        voiceover: 'Bạn đang bỏ lỡ deal này...',
      },
      {
        durationSec: body,
        onScreenText: '3 lý do nên mua ngay',
        voiceover: 'Lý do 1, 2, 3...',
      },
      {
        durationSec: Math.max(3, cta),
        onScreenText: 'Link affiliate ở bio',
        voiceover: 'Comment MUON để nhận link',
      },
    ],
    caption: `${productTitle} — review nhanh, link ở bio`,
    hashtags: ['tiktokshop', 'affiliate', 'review', 'musthave', 'fyp'],
    ctaAffiliate: 'Disclosure: #quangcao #affiliate — link ở bio',
  };
}

async function generatePlan(
  input: Record<string, string>,
  page: Awaited<ReturnType<typeof fetchProductPageData>>,
): Promise<VideoPlan> {
  const duration = resolveScriptDuration(input);
  const productTitle = page.title ?? 'Sản phẩm';

  if (!isFreeLlmConfigured()) {
    return normalizeSceneDurations(mockPlan(productTitle, duration), duration);
  }

  const langLabel = LANGUAGE_LABELS[input.language] ?? input.language;
  const userPrompt = `Tạo JSON video plan affiliate.
- Ngôn ngữ: ${langLabel}
- Tổng thời lượng: ${duration} giây (tổng durationSec scenes = ${duration})
- Phong cách: ${input.style}
- Đối tượng: ${input.targetAudience || 'Người mua online 18-35'}
${input.sellingPoints ? `- USP ưu tiên: ${input.sellingPoints}` : ''}
${input.affiliateNote ? `- Affiliate note: ${input.affiliateNote}` : ''}

Sản phẩm:
- URL: ${page.url}
- Title: ${page.title ?? 'N/A'}
- Description: ${page.description ?? 'N/A'}
- Giá: ${page.price ?? 'N/A'}

Snippet:
${page.textSnippet.slice(0, 3500)}`;

  const raw = await freeLlmComplete(
    [
      { role: 'system', content: PLAN_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.65, maxTokens: 2048, jsonMode: true },
  );

  const plan = parseVideoPlanJson(raw);
  return normalizeSceneDurations(plan, duration);
}

export async function executeUrlToVideo(input: Record<string, string>): Promise<ToolCustomResult> {
  const page = await fetchProductPageData(input.productUrl);
  const duration = resolveScriptDuration(input);
  const plan = await generatePlan(input, page);
  const markdown = planToMarkdown(plan, input.productUrl, duration);

  let videoUrl: string | undefined;
  let veoModel: string | undefined;
  try {
    const veo = await generateAffiliateVideoWithVeo(plan, {
      imageUrl: page.imageUrl,
      style: input.style ?? 'ugc-review',
      targetDurationSec: Number(input.duration) || 30,
      clipOnly: isClipOnlyMode(input),
      veoModel: input.veoModel,
    });
    videoUrl = veo.videoUrl;
    veoModel = veo.model;

    const warnBlock =
      veo.warnings.length > 0
        ? `\n\n> ${veo.warnings.join('\n> ')}`
        : '';

    return {
      output: `${markdown}\n\n## Video Veo 3 đã tạo\n\n- **Model:** ${veo.model}\n- **Thời lượng video:** ~${veo.actualDurationSec}s${veo.extended ? ' (auto-extend)' : ' (clip đơn)'}\n\nTải xuống hoặc xem preview bên dưới.${warnBlock}`,
      videoUrl,
      model: `${resolveFreeLlmLabel()} + ${veo.model}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Veo generation thất bại';
    const quotaHint = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')
      ? '\n> Quota Veo/Gemini đã hết — kiểm tra billing tại https://ai.dev/rate-limit'
      : '';
    return {
      output: `${markdown}\n\n> ⚠️ Không tạo được video Veo: ${msg}\n> Cần \`GEMINI_API_KEY\` với quyền Veo 3 (paid preview).${quotaHint}`,
      videoUrl: undefined,
      model: veoModel ?? resolveFreeLlmLabel(),
    };
  }
}
