/** Catalog kịch bản Veo 3 — hook 3s + format nội dung */

export type ScenarioStyleKey =
  | 'hook-attention'
  | 'hook-curiosity'
  | 'hook-shock'
  | 'hook-question'
  | 'hook-story'
  | 'hook-social-proof'
  | 'ugc-review'
  | 'unboxing'
  | 'tutorial'
  | 'comparison'
  | 'problem-solution';

export type ScenarioStyleDef = {
  key: ScenarioStyleKey;
  label: string;
  group: 'hook' | 'content';
  veoHint: string;
  title: string;
  hookVi: (productTitle: string) => string;
  hookEn: (productTitle: string) => string;
};

export const VEO_SCENARIO_STYLES: Record<ScenarioStyleKey, ScenarioStyleDef> = {
  'hook-attention': {
    key: 'hook-attention',
    label: 'Hook 3s thu hút',
    group: 'hook',
    title: 'Hook 3s — Dừng scroll',
    veoHint:
      'pattern-interrupt opening, creator looks directly at camera, bold on-screen text in first 3 seconds, high energy stop-scroll moment',
    hookVi: (t) => `Dừng scroll ngay! Bạn đang bỏ lỡ ${t} đấy!`,
    hookEn: (t) => `Stop scrolling — you need to see this ${t}!`,
  },
  'hook-curiosity': {
    key: 'hook-curiosity',
    label: 'Tò mò / cliffhanger',
    group: 'hook',
    title: 'Hook tò mò 3s',
    veoHint:
      'curiosity gap hook, mysterious tease, creator withholds answer until second 4, suspenseful pacing',
    hookVi: (t) => `99% người dùng ${t} sai cách — xem hết clip này`,
    hookEn: (t) => `Most people use ${t} wrong — watch until the end`,
  },
  'hook-shock': {
    key: 'hook-shock',
    label: 'Gây sốc nhẹ',
    group: 'hook',
    title: 'Hook gây sốc',
    veoHint:
      'mild shock value hook, surprising reveal or unexpected result in first 3 seconds, authentic reaction face',
    hookVi: (t) => `Không tin được ${t} lại hiệu quả thế này`,
    hookEn: (t) => `I can't believe ${t} works this well`,
  },
  'hook-question': {
    key: 'hook-question',
    label: 'Câu hỏi kích thích',
    group: 'hook',
    title: 'Hook câu hỏi',
    veoHint:
      'rhetorical question hook, creator asks viewer directly, engaging eye contact, question text overlay',
    hookVi: (t) => `Tại sao ${t} hot trên TikTok Shop vậy?`,
    hookEn: (t) => `Why is everyone buying ${t} on TikTok Shop?`,
  },
  'hook-story': {
    key: 'hook-story',
    label: 'Mini storytelling',
    group: 'hook',
    title: 'Hook kể chuyện',
    veoHint:
      'micro story hook, relatable personal moment in first 3 seconds, emotional connection before product reveal',
    hookVi: (t) => `Tuần trước mình thử ${t} — và đây là chuyện gì xảy ra`,
    hookEn: (t) => `I tried ${t} last week — here's what happened`,
  },
  'hook-social-proof': {
    key: 'hook-social-proof',
    label: 'Social proof',
    group: 'hook',
    title: 'Hook social proof',
    veoHint:
      'social proof hook, trending product vibe, sold-out energy, creator shows orders or reviews in opening',
    hookVi: (t) => `Sản phẩm ${t} đang bán chạy — mình test thử cho bạn`,
    hookEn: (t) => `${t} is trending — I had to try it for you`,
  },
  'ugc-review': {
    key: 'ugc-review',
    label: 'UGC Review',
    group: 'content',
    title: 'UGC Review tự nhiên',
    veoHint: 'UGC TikTok review, handheld camera, warm indoor lighting, authentic creator energy',
    hookVi: (t) => `Review thật ${t} sau 1 tuần dùng`,
    hookEn: (t) => `Honest ${t} review after one week`,
  },
  unboxing: {
    key: 'unboxing',
    label: 'Unboxing',
    group: 'content',
    title: 'Unboxing nhanh',
    veoHint: 'fast unboxing, close-up product reveal, excited tone, satisfying unwrap moments',
    hookVi: (t) => `Mở hộp ${t} cùng mình nha!`,
    hookEn: (t) => `Let's unbox this ${t}!`,
  },
  tutorial: {
    key: 'tutorial',
    label: 'Tutorial',
    group: 'content',
    title: 'Tutorial 8s',
    veoHint: 'how-to demo, clear step-by-step, friendly voiceover, product in use',
    hookVi: (t) => `Cách dùng ${t} đúng trong 8 giây`,
    hookEn: (t) => `How to use ${t} the right way in 8 seconds`,
  },
  comparison: {
    key: 'comparison',
    label: 'Before / After',
    group: 'content',
    title: 'Before / After',
    veoHint: 'before-after transformation, split focus, convincing results, dramatic reveal',
    hookVi: (t) => `Trước và sau khi dùng ${t} — khác biệt rõ ràng`,
    hookEn: (t) => `Before vs after using ${t} — huge difference`,
  },
  'problem-solution': {
    key: 'problem-solution',
    label: 'Problem → Solution',
    group: 'content',
    title: 'Problem → Solution',
    veoHint: 'relatable pain point hook, then product as solution, emotional payoff',
    hookVi: (t) => `Mệt mỏi vì...? ${t} có thể giúp bạn`,
    hookEn: (t) => `Tired of this problem? ${t} might be the fix`,
  },
};

/** Thứ tự mặc định: ưu tiên hook viral trước, sau đó format nội dung */
export const DEFAULT_SCENARIO_ORDER: ScenarioStyleKey[] = [
  'hook-attention',
  'hook-curiosity',
  'hook-shock',
  'hook-question',
  'hook-story',
  'hook-social-proof',
  'ugc-review',
  'unboxing',
  'tutorial',
  'comparison',
  'problem-solution',
];

export const HOOK_SCENARIO_KEYS = DEFAULT_SCENARIO_ORDER.filter(
  (k) => VEO_SCENARIO_STYLES[k].group === 'hook',
);

export const SCENARIO_STYLE_OPTIONS = DEFAULT_SCENARIO_ORDER.map((key) => ({
  label: VEO_SCENARIO_STYLES[key].label,
  value: key,
}));

export function getScenarioStyleLabel(style: string): string {
  return VEO_SCENARIO_STYLES[style as ScenarioStyleKey]?.label ?? style;
}

export function pickScenarioStyles(count: number, focusStyle?: string): ScenarioStyleKey[] {
  const n = Math.min(5, Math.max(2, count));
  if (focusStyle && focusStyle in VEO_SCENARIO_STYLES) {
    const focus = focusStyle as ScenarioStyleKey;
    const rest = DEFAULT_SCENARIO_ORDER.filter((k) => k !== focus);
    return [focus, ...rest].slice(0, n);
  }
  return DEFAULT_SCENARIO_ORDER.slice(0, n);
}

export function getVeoHint(style: string): string {
  return VEO_SCENARIO_STYLES[style as ScenarioStyleKey]?.veoHint ?? VEO_SCENARIO_STYLES['ugc-review'].veoHint;
}
