import { z } from 'zod';
import { getVeoHint } from '@/modules/ai-tools/veo/scenario-styles';
import type { ProductInsights } from '@/modules/ai-tools/veo/product-analysis';

export const VeoSceneSchema = z.object({
  durationSec: z.number().min(1).max(8),
  visual: z.string(),
  voiceover: z.string().optional(),
  onScreenText: z.string().optional(),
});

export const VeoScriptScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  style: z.string(),
  durationSec: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  hook: z.string(),
  scenes: z.array(VeoSceneSchema).min(1).max(6),
  veoPrompt: z.string().min(20),
  caption: z.string(),
  hashtags: z.array(z.string()).min(2).max(12),
  cta: z.string().optional(),
});

export const VeoPromptBundleSchema = z.object({
  productTitle: z.string(),
  productUrl: z.string(),
  imageUrl: z.string().optional(),
  price: z.string().optional(),
  sellingPoints: z.array(z.string()).min(1).max(6),
  productInsights: z
    .object({
      productSummary: z.string(),
      category: z.string().optional(),
      targetAudience: z.string().optional(),
      painPoints: z.array(z.string()),
      benefits: z.array(z.string()),
      uniqueSellingPoints: z.array(z.string()),
      keywords: z.array(z.string()).optional(),
      hookAngles: z.array(
        z.object({
          angle: z.string(),
          rationale: z.string(),
          sampleHook: z.string(),
        }),
      ),
    })
    .optional(),
  scenarios: z.array(VeoScriptScenarioSchema).min(2).max(5),
  veoTips: z.array(z.string()).optional(),
});

export type VeoScriptScenario = z.infer<typeof VeoScriptScenarioSchema>;
export type VeoPromptBundle = z.infer<typeof VeoPromptBundleSchema>;

export function buildVeo3Prompt(params: {
  productTitle: string;
  style: string;
  hook: string;
  scenes: { visual: string; voiceover?: string }[];
  sellingPoints: string[];
  keywords?: string[];
}): string {
  const styleHint = getVeoHint(params.style);
  const dialogue = params.scenes
    .map((s) => s.voiceover)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

  return [
    'Vertical 9:16 TikTok Shop affiliate product video for Google Veo 3.',
    styleHint,
    params.style.startsWith('hook-')
      ? 'First 3 seconds: maximum scroll-stopping hook, direct eye contact, bold text overlay.'
      : '',
    `Product: ${params.productTitle}.`,
    `Key benefits: ${params.sellingPoints.slice(0, 3).join('; ')}.`,
    params.keywords?.length ? `Product keywords: ${params.keywords.slice(0, 5).join(', ')}.` : '',
    `Opening hook: "${params.hook}".`,
    dialogue ? `Native audio dialogue: "${dialogue}".` : '',
    'Visual flow: ' + params.scenes.map((s) => s.visual).join(' → '),
    'Smooth camera movement, cinematic lighting, authentic UGC feel.',
    'Synchronized voiceover and subtle upbeat background music.',
    'No fake price tags, no misleading claims.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function parseVeoPromptBundle(raw: string): VeoPromptBundle {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return VeoPromptBundleSchema.parse(JSON.parse(jsonText));
}

export function bundleToMarkdown(bundle: VeoPromptBundle): string {
  let md = `## ${bundle.productTitle}\n\n`;
  md += `- **URL:** ${bundle.productUrl}\n`;
  if (bundle.price) md += `- **Giá:** ${bundle.price}\n`;

  if (bundle.productInsights) {
    const ins = bundle.productInsights;
    md += `\n### Phân tích AI sản phẩm\n`;
    md += `${ins.productSummary}\n\n`;
    if (ins.category) md += `- **Ngành:** ${ins.category}\n`;
    if (ins.targetAudience) md += `- **Đối tượng:** ${ins.targetAudience}\n`;
    md += `\n**Lợi ích:** ${ins.benefits.join(' · ')}\n`;
    md += `**Nỗi đau:** ${ins.painPoints.join(' · ')}\n`;
  }

  md += `\n### Điểm bán hàng\n${bundle.sellingPoints.map((p) => `- ${p}`).join('\n')}\n`;

  for (const sc of bundle.scenarios) {
    md += `\n---\n\n### ${sc.title} (${sc.durationSec}s · ${sc.style})\n\n`;
    md += `**Hook:** ${sc.hook}\n\n`;
    md += `| Thời gian | Hình ảnh | Voiceover | Text |\n|-----------|----------|-----------|------|\n`;
    let t = 0;
    for (const scene of sc.scenes) {
      const end = t + scene.durationSec;
      md += `| ${t}-${end}s | ${scene.visual} | ${scene.voiceover ?? '—'} | ${scene.onScreenText ?? '—'} |\n`;
      t = end;
    }
    md += `\n**Veo 3 prompt (copy):**\n\`\`\`\n${sc.veoPrompt}\n\`\`\`\n`;
    md += `\n**Caption:** ${sc.caption}\n\n**Hashtags:** ${sc.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}\n`;
    if (sc.cta) md += `\n**CTA:** ${sc.cta}\n`;
  }

  if (bundle.veoTips?.length) {
    md += `\n### Mẹo dùng Veo 3\n${bundle.veoTips.map((t) => `- ${t}`).join('\n')}\n`;
  }

  return md;
}

export function insightsToBundleField(insights: ProductInsights): VeoPromptBundle['productInsights'] {
  return {
    productSummary: insights.productSummary,
    category: insights.category,
    targetAudience: insights.targetAudience,
    painPoints: insights.painPoints,
    benefits: insights.benefits,
    uniqueSellingPoints: insights.uniqueSellingPoints,
    keywords: insights.keywords,
    hookAngles: insights.hookAngles,
  };
}
