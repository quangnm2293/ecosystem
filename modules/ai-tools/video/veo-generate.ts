import {
  fetchImageAsBase64,
  generateVeoVideo,
  resolveVeoModel,
  isVeoConfigured,
  saveVeoVideoToPublic,
  type VeoDuration,
  type VeoModelPreset,
} from '@/lib/ai/veo';
import type { VideoPlan } from '@/modules/ai-tools/video/plan';

const STYLE_HINTS: Record<string, string> = {
  'ugc-review': 'UGC TikTok review tự nhiên, handheld camera, ánh sáng trong nhà ấm',
  unboxing: 'Unboxing nhanh, close-up sản phẩm, năng lượng hào hứng',
  tutorial: 'Tutorial how-to, demo tính năng rõ ràng, giọng thân thiện',
  comparison: 'Before-after comparison, split focus, kết quả thuyết phục',
};

function buildInitialPrompt(plan: VideoPlan, style: string): string {
  const styleHint = STYLE_HINTS[style] ?? STYLE_HINTS['ugc-review'];
  const points = plan.sellingPoints.slice(0, 3).join('; ');
  const hook = plan.scenes[0]?.voiceover ?? plan.scenes[0]?.onScreenText ?? '';
  const dialogue = plan.scenes
    .map((s) => s.voiceover)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

  return [
    `Vertical TikTok affiliate product video, 9:16, ${styleHint}.`,
    `Product: ${plan.productTitle}.`,
    `Key benefits: ${points}.`,
    `Opening hook — creator says: "${hook}".`,
    dialogue ? `Dialogue with native audio: "${dialogue}".` : '',
    'Dynamic product showcase, smooth camera movement, professional lighting, authentic UGC feel.',
    'Include synchronized voiceover and subtle background music suitable for TikTok Shop.',
    'No fake price tags or misleading claims.',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildExtensionPrompt(plan: VideoPlan, extensionIndex: number): string {
  const scene = plan.scenes[Math.min(extensionIndex + 1, plan.scenes.length - 1)];
  const text = scene?.voiceover ?? scene?.onScreenText ?? plan.ctaAffiliate;
  return [
    `Continue the TikTok affiliate product video seamlessly.`,
    `Product: ${plan.productTitle}.`,
    `Creator continues: "${text}".`,
    'Maintain same visual style, lighting, and product focus. Smooth transition from previous clip.',
    'Include natural voiceover and upbeat background music.',
  ].join(' ');
}

function extensionCount(targetSec: number): number {
  if (targetSec <= 8) return 0;
  return Math.min(Math.ceil((targetSec - 8) / 7), 7);
}

export type VeoAffiliateOptions = {
  imageUrl: string | null;
  style: string;
  targetDurationSec: number;
  /** Chỉ 1 clip 8s — không gọi extend API */
  clipOnly?: boolean;
  /** `fast` | `standard` hoặc model id đầy đủ */
  veoModel?: string;
};

export type VeoAffiliateResult = {
  videoUrl: string;
  model: string;
  actualDurationSec: number;
  extended: boolean;
  warnings: string[];
};

export async function generateAffiliateVideoWithVeo(
  plan: VideoPlan,
  options: VeoAffiliateOptions,
): Promise<VeoAffiliateResult> {
  if (!isVeoConfigured()) {
    throw new Error(
      'GEMINI_API_KEY chưa cấu hình. Veo 3 cần Gemini API key (paid preview) — lấy tại https://aistudio.google.com/apikey',
    );
  }

  const modelId = resolveVeoModel(options.veoModel);
  const isFast = modelId.includes('-fast-');
  const warnings: string[] = [];
  const productImage = options.imageUrl ? await fetchImageAsBase64(options.imageUrl) : null;

  const clipDuration: VeoDuration = 8;
  const extensions = options.clipOnly ? 0 : extensionCount(options.targetDurationSec);

  if (options.clipOnly) {
    warnings.push('Chế độ clip 8s — 1 lần gọi Veo, không extend (nhanh & rẻ nhất).');
  } else if (options.targetDurationSec > 8 && extensions > 0) {
    warnings.push(
      `Auto-extend: clip 8s + ${extensions} lần mở rộng (≈${8 + extensions * 7}s). Có thể mất vài phút.`,
    );
  }

  if (isFast) {
    warnings.push('Model Veo Fast — render nhanh hơn, chi phí thấp hơn Standard.');
  }

  let result = await generateVeoVideo({
    model: modelId,
    prompt: buildInitialPrompt(plan, options.style),
    aspectRatio: '9:16',
    durationSeconds: clipDuration,
    resolution: '720p',
    image: productImage ?? undefined,
    personGeneration: productImage ? 'allow_adult' : 'allow_all',
  });

  if (result.raiFiltered?.length) {
    warnings.push(...result.raiFiltered.map((r) => `RAI filter: ${r}`));
  }

  for (let i = 0; i < extensions; i++) {
    result = await generateVeoVideo({
      model: modelId,
      prompt: buildExtensionPrompt(plan, i),
      aspectRatio: '9:16',
      durationSeconds: 8,
      resolution: '720p',
      video: { mimeType: 'video/mp4', data: result.videoBytes.toString('base64') },
      personGeneration: 'allow_all',
    });

    if (result.raiFiltered?.length) {
      warnings.push(...result.raiFiltered.map((r) => `RAI filter (extend ${i + 1}): ${r}`));
    }
  }

  const videoUrl = await saveVeoVideoToPublic(result.videoBytes);
  const actualDurationSec = extensions === 0 ? clipDuration : 8 + extensions * 7;

  return {
    videoUrl,
    model: modelId,
    actualDurationSec,
    extended: extensions > 0,
    warnings,
  };
}

export function resolveVeoModelFromInput(input: Record<string, string>): string {
  const preset = input.veoModel as VeoModelPreset | undefined;
  return resolveVeoModel(preset ?? process.env.VEO_MODEL);
}

export function isClipOnlyMode(input: Record<string, string>): boolean {
  return input.veoOutput !== 'auto-extend';
}

export function resolveScriptDuration(input: Record<string, string>): number {
  if (isClipOnlyMode(input)) return 8;
  return Number(input.duration) || 30;
}
