import { freeLlmComplete, isFreeLlmConfigured, resolveFreeLlmLabel } from '@/lib/ai/free-llm';
import { fetchProductPageData } from '@/lib/scraper/product-url';
import {
  analyzeProductForHooks,
  formatInsightsForScriptPrompt,
  insightsToSellingPoints,
  pickHookForStyle,
  type ProductInsights,
} from '@/modules/ai-tools/veo/product-analysis';
import {
  buildVeo3Prompt,
  bundleToMarkdown,
  insightsToBundleField,
  parseVeoPromptBundle,
  type VeoPromptBundle,
  type VeoScriptScenario,
} from '@/modules/ai-tools/veo/prompt-bundle';
import {
  pickScenarioStyles,
  VEO_SCENARIO_STYLES,
  type ScenarioStyleKey,
} from '@/modules/ai-tools/veo/scenario-styles';
import type { ToolCustomResult, ToolStructuredResult } from '@/modules/ai-tools/types';

const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

const STYLE_ENUM = Object.keys(VEO_SCENARIO_STYLES).join(' | ');

const SCRIPT_SYSTEM = `Bạn là chuyên gia TikTok Shop affiliate + Google Veo 3.
Bạn nhận PHÂN TÍCH SẢN PHẨM từ dữ liệu thực tế — mọi hook và script PHẢI bám chi tiết sản phẩm đó.

Trả về ĐÚNG MỘT JSON object (không markdown):
{
  "productTitle": string,
  "productUrl": string,
  "imageUrl": string | null,
  "price": string | null,
  "sellingPoints": string[] (từ phân tích USP/lợi ích),
  "scenarios": [{
    "id": "scenario-1",
    "title": string,
    "style": ${STYLE_ENUM},
    "durationSec": 8,
    "hook": string (0-3s, nhắc TÊN/TÍNH NĂNG/LỢI ÍCH cụ thể từ phân tích),
    "scenes": [{
      "durationSec": number,
      "visual": string (mô tả hình ảnh có sản phẩm + context từ mô tả),
      "voiceover": string,
      "onScreenText": string (<=12 từ)
    }],
    "veoPrompt": string (tiếng Anh, cinematic Veo 3, nhắc product details),
    "caption": string,
    "hashtags": string[],
    "cta": string
  }],
  "veoTips": string[]
}

Quy tắc BẮT BUỘC:
- Scene 1 = đúng 3 giây, hook viral gắn lợi ích/đau điểm CỤ THỂ của sản phẩm.
- Scene 2+ demo tính năng từ mô tả — không câu chung chung.
- Mỗi scenario một style khác nhau; hook khác nhau, không lặp.
- veoPrompt tiếng Anh, có product name + key benefit từ phân tích.
- Không bịa giá/số liệu nếu không có trong dữ liệu.`;

function buildMockScenario(
  styleKey: ScenarioStyleKey,
  index: number,
  productTitle: string,
  language: string,
  insights: ProductInsights,
  sellingPoints: string[],
): VeoScriptScenario {
  const def = VEO_SCENARIO_STYLES[styleKey];
  const durationSec = 8 as const;
  const hook = pickHookForStyle(styleKey, insights, language, index);
  const benefit = insights.benefits[index % insights.benefits.length] ?? sellingPoints[0];
  const isHookStyle = def.group === 'hook';
  const vi = language !== 'en';

  const scenes = [
    {
      durationSec: 3,
      visual: isHookStyle
        ? `Creator to-camera, ${productTitle} in hand, hook text overlay, ${insights.category ?? 'product'} context`
        : `Close-up ${productTitle}, highlight: ${benefit.slice(0, 40)}`,
      voiceover: hook,
      onScreenText: hook.slice(0, 42),
    },
    {
      durationSec: 5,
      visual: `Demo ${productTitle}: ${benefit} — lifestyle shot, 9:16 TikTok Shop`,
      voiceover: benefit,
      onScreenText: vi ? 'Link bio' : 'Link in bio',
    },
  ];

  return {
    id: `scenario-${index + 1}`,
    title: def.title,
    style: styleKey,
    durationSec,
    hook,
    scenes,
    veoPrompt: buildVeo3Prompt({
      productTitle,
      style: styleKey,
      hook,
      scenes,
      sellingPoints,
      keywords: insights.keywords,
    }),
    caption: `${productTitle} — ${benefit.slice(0, 50)}`,
    hashtags: [
      'tiktokshop',
      'affiliate',
      'fyp',
      'veo3',
      ...(insights.keywords.slice(0, 2).map((k) => k.replace(/\s+/g, '')) ?? []),
    ],
    cta: vi ? 'Comment MUON để nhận link' : 'Comment LINK for the product',
  };
}

function mockBundle(
  page: Awaited<ReturnType<typeof fetchProductPageData>>,
  language: string,
  count: number,
  insights: ProductInsights,
  focusStyle?: string,
): VeoPromptBundle {
  const title = page.title ?? insights.productSummary.slice(0, 60) ?? 'Sản phẩm TikTok Shop';
  const sellingPoints = insightsToSellingPoints(insights);
  const styleKeys = pickScenarioStyles(count, focusStyle);
  const scenarios = styleKeys.map((key, i) =>
    buildMockScenario(key, i, title, language, insights, sellingPoints),
  );

  return {
    productTitle: title,
    productUrl: page.url,
    imageUrl: page.imageUrl ?? undefined,
    price: page.price ?? undefined,
    sellingPoints,
    productInsights: insightsToBundleField(insights),
    scenarios,
    veoTips: [
      'Hook phải nhắc tính năng cụ thể từ mô tả sản phẩm — A/B test nhiều góc.',
      '3 giây đầu quyết định retention.',
      'Dùng ảnh sản phẩm khi render Veo (image-to-video).',
    ],
  };
}

function enrichVeoPrompts(bundle: VeoPromptBundle, keywords?: string[]): VeoPromptBundle {
  return {
    ...bundle,
    scenarios: bundle.scenarios.map((sc) => ({
      ...sc,
      veoPrompt:
        sc.veoPrompt.length >= 40
          ? sc.veoPrompt
          : buildVeo3Prompt({
              productTitle: bundle.productTitle,
              style: sc.style,
              hook: sc.hook,
              scenes: sc.scenes,
              sellingPoints: bundle.sellingPoints,
              keywords,
            }),
    })),
  };
}

async function generateScriptsWithAi(
  page: Awaited<ReturnType<typeof fetchProductPageData>>,
  insights: ProductInsights,
  language: string,
  scenarioCount: number,
  focusStyle?: string,
): Promise<VeoPromptBundle> {
  const langLabel = LANGUAGE_LABELS[language] ?? language;
  const styleKeys = pickScenarioStyles(scenarioCount, focusStyle);
  const analysisBlock = formatInsightsForScriptPrompt(insights, language);

  const userPrompt = `Tạo ${scenarioCount} kịch bản video Veo 3 affiliate.

${analysisBlock}

---
Thông tin trang:
- URL: ${page.url}
- Tiêu đề: ${page.title ?? 'N/A'}
- Meta mô tả: ${page.description ?? 'N/A'}
- Giá: ${page.price ?? 'N/A'}

Styles bắt buộc (mỗi scenario một style): ${styleKeys.join(', ')}
Ngôn ngữ voiceover/caption: ${langLabel}
Mỗi scenario: durationSec 8, scene đầu 3 giây.

Trích thêm từ trang (nếu cần chi tiết):
${page.textSnippet.slice(0, 2500)}`;

  const raw = await freeLlmComplete(
    [
      { role: 'system', content: SCRIPT_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.72, maxTokens: 4500, jsonMode: true },
  );

  const parsed = parseVeoPromptBundle(raw);
  return enrichVeoPrompts(
    {
      ...parsed,
      productUrl: page.url,
      productTitle: parsed.productTitle || page.title || insights.productSummary.slice(0, 80) || 'Sản phẩm',
      imageUrl: parsed.imageUrl ?? page.imageUrl ?? undefined,
      price: parsed.price ?? page.price ?? undefined,
      sellingPoints:
        parsed.sellingPoints.length > 0 ? parsed.sellingPoints : insightsToSellingPoints(insights),
      productInsights: insightsToBundleField(insights),
    },
    insights.keywords,
  );
}

export async function executeTiktokVeoPrompt(input: Record<string, string>): Promise<ToolCustomResult> {
  const page = await fetchProductPageData(input.productUrl, {
    productHint: input.productHint,
  });
  const language = input.language?.trim() || 'vi';
  const scenarioCount = Math.min(5, Math.max(2, Number(input.scenarioCount) || 3));
  const focusStyle = input.focusStyle?.trim() || undefined;

  // Bước 1: AI phân tích sản phẩm từ mô tả thực tế
  const insights = await analyzeProductForHooks(page, language);

  let bundle: VeoPromptBundle;

  if (!isFreeLlmConfigured()) {
    bundle = mockBundle(page, language, scenarioCount, insights, focusStyle);
  } else {
    try {
      // Bước 2: Tạo kịch bản + hook dựa trên phân tích
      bundle = await generateScriptsWithAi(page, insights, language, scenarioCount, focusStyle);
    } catch {
      bundle = mockBundle(page, language, scenarioCount, insights, focusStyle);
    }
  }

  const structured: ToolStructuredResult = {
    kind: 'veo-prompt-scripts',
    productTitle: bundle.productTitle,
    productUrl: bundle.productUrl,
    imageUrl: bundle.imageUrl,
    price: bundle.price,
    sellingPoints: bundle.sellingPoints,
    productInsights: bundle.productInsights,
    scenarios: bundle.scenarios,
    veoTips: bundle.veoTips,
  };

  return {
    output: bundleToMarkdown(bundle),
    model: resolveFreeLlmLabel(),
    structured,
  };
}
