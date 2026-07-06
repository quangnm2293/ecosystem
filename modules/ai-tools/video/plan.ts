import { z } from 'zod';

export const VideoSceneSchema = z.object({
  durationSec: z.number().min(2).max(25),
  onScreenText: z.string().min(1).max(120),
  voiceover: z.string().optional(),
});

export const VideoPlanSchema = z.object({
  productTitle: z.string(),
  sellingPoints: z.array(z.string()).min(1).max(6),
  scenes: z.array(VideoSceneSchema).min(2).max(8),
  caption: z.string(),
  hashtags: z.array(z.string()).min(3).max(15),
  ctaAffiliate: z.string(),
});

export type VideoPlan = z.infer<typeof VideoPlanSchema>;

export function parseVideoPlanJson(raw: string): VideoPlan {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(jsonText) as unknown;
  return VideoPlanSchema.parse(parsed);
}

export function normalizeSceneDurations(plan: VideoPlan, totalSec: number): VideoPlan {
  const sum = plan.scenes.reduce((s, sc) => s + sc.durationSec, 0);
  if (sum === totalSec) return plan;

  const ratio = totalSec / sum;
  const scenes = plan.scenes.map((sc, i, arr) => {
    if (i === arr.length - 1) {
      const used = arr.slice(0, -1).reduce((s, x) => s + Math.max(2, Math.round(x.durationSec * ratio)), 0);
      return { ...sc, durationSec: Math.max(2, totalSec - used) };
    }
    return { ...sc, durationSec: Math.max(2, Math.round(sc.durationSec * ratio)) };
  });

  return { ...plan, scenes };
}

export function planToMarkdown(plan: VideoPlan, productUrl: string, duration: number): string {
  let md = `## Thông tin sản phẩm\n\n- **URL:** ${productUrl}\n- **Tên:** ${plan.productTitle}\n- **Thời lượng:** ${duration}s\n\n`;
  md += `## Điểm bán hàng cốt lõi\n\n${plan.sellingPoints.map((p) => `- ${p}`).join('\n')}\n\n`;
  md += `## Kịch bản video (${duration}s)\n\n| Thời gian | On-screen | Voiceover |\n|-----------|-----------|----------|\n`;

  let t = 0;
  for (const sc of plan.scenes) {
    const end = t + sc.durationSec;
    md += `| ${t}-${end}s | ${sc.onScreenText} | ${sc.voiceover ?? '—'} |\n`;
    t = end;
  }

  md += `\n## Caption TikTok\n\n${plan.caption}\n\n## Hashtags\n\n${plan.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}\n\n## CTA Affiliate\n\n${plan.ctaAffiliate}\n`;
  return md;
}
