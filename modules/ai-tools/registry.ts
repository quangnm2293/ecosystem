import type { AiToolDefinition } from '@/modules/ai-tools/types';
import { executeUrlToVideo } from '@/modules/ai-tools/tools/url-to-video';
import { executeTiktokVeoPrompt } from '@/modules/ai-tools/tools/tiktok-veo-prompt';
import { SCENARIO_STYLE_OPTIONS } from '@/modules/ai-tools/veo/scenario-styles';
import { TIKTOK_ANALYTICS_TOOLS } from '@/modules/tiktok-analytics/registry';

const writingSeo = {
  howToUse: [
    'Nhập chủ đề hoặc từ khóa chính vào form.',
    'Chọn tone và độ dài phù hợp với mục tiêu SEO.',
    'Nhấn Generate và chỉnh sửa kết quả trước khi publish.',
  ],
  examples: [
    {
      title: 'Bài blog về yoga tại nhà',
      input: { topic: 'Yoga tại nhà cho người mới', tone: 'friendly', length: 'medium' },
      outputPreview: '## Yoga tại nhà: Hướng dẫn 15 phút mỗi ngày\n\nBạn không cần studio...',
    },
  ],
  faq: [
    { q: 'Công cụ có miễn phí không?', a: 'Có, bạn có thể tạo nội dung miễn phí với giới hạn hàng ngày.' },
    { q: 'Kết quả có unique không?', a: 'Mỗi lần generate tạo nội dung mới; hãy review trước khi đăng.' },
  ],
};

export const blogWriterTool: AiToolDefinition = {
  toolKey: 'blog-writer',
  slug: 'ai-blog-writer',
  name: 'AI Blog Writer',
  description: 'Viết bài blog SEO chuẩn với cấu trúc heading, intro và CTA — miễn phí.',
  category: 'writing',
  categoryLabel: 'Writing',
  implemented: true,
  inputFields: [
    { name: 'topic', label: 'Chủ đề / từ khóa', type: 'text', placeholder: 'VD: Cách làm SEO cho blog', required: true },
    {
      name: 'tone',
      label: 'Tone',
      type: 'select',
      options: [
        { label: 'Professional', value: 'professional' },
        { label: 'Friendly', value: 'friendly' },
        { label: 'Persuasive', value: 'persuasive' },
      ],
      defaultValue: 'friendly',
    },
    {
      name: 'length',
      label: 'Độ dài',
      type: 'select',
      options: [
        { label: 'Ngắn (~500 từ)', value: 'short' },
        { label: 'Trung bình (~1000 từ)', value: 'medium' },
        { label: 'Dài (~1500 từ)', value: 'long' },
      ],
      defaultValue: 'medium',
    },
    { name: 'audience', label: 'Đối tượng đọc (optional)', type: 'text', placeholder: 'VD: startup founders', required: false },
  ],
  outputFormat: 'markdown',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2000,
  affiliateTrackingId: 'demo-a',
  affiliateCtaLabel: 'Dùng Jasper AI — miễn phí 7 ngày',
  affiliateCtaDescription: 'Nâng cấp workflow viết content với template chuyên nghiệp.',
  seo: writingSeo,
  relatedToolKeys: ['product-description', 'tiktok-script'],
  systemPrompt: `You are an expert SEO content writer. Write in Vietnamese unless the topic is clearly English.
Use markdown with H2/H3 headings, bullet points where helpful, and a clear CTA at the end.
Do not invent fake statistics. Be helpful and original.`,
  buildUserPrompt: (input) =>
    `Write a blog post about: "${input.topic}"
Tone: ${input.tone}
Length: ${input.length}
${input.audience ? `Target audience: ${input.audience}` : ''}

Include: compelling intro, 3-5 sections with H2 headings, conclusion with CTA.`,
};

export const tiktokScriptTool: AiToolDefinition = {
  toolKey: 'tiktok-script',
  slug: 'ai-tiktok-script-generator',
  name: 'TikTok → Veo 3 Prompt',
  description:
    'Dán link sản phẩm TikTok Shop — nhận 3–4 kịch bản video affiliate và prompt tiếng Anh sẵn sàng cho Google Veo 3.',
  category: 'social',
  categoryLabel: 'TikTok Shop',
  implemented: true,
  inputFields: [
    {
      name: 'productUrl',
      label: 'Link sản phẩm TikTok Shop',
      type: 'text',
      placeholder: 'https://shop.tiktok.com/view/product/...',
      required: true,
    },
    {
      name: 'productHint',
      label: 'Mô tả sản phẩm (nếu link không load)',
      type: 'textarea',
      placeholder:
        'VD: Kính cường lực iPhone chống nhìn trộm, chống vân tay, cảm ứng nhạy — chỉ cần khi TikTok chặn bot',
      required: false,
      rows: 3,
    },
    {
      name: 'language',
      label: 'Ngôn ngữ voiceover / caption',
      type: 'select',
      required: false,
      options: [
        { label: 'Tiếng Việt', value: 'vi' },
        { label: 'English', value: 'en' },
      ],
      defaultValue: 'vi',
    },
    {
      name: 'focusStyle',
      label: 'Phong cách ưu tiên (optional)',
      type: 'select',
      required: false,
      options: [{ label: 'Đa dạng — hook + UGC (mặc định)', value: '' }, ...SCENARIO_STYLE_OPTIONS],
      defaultValue: '',
    },
    {
      name: 'scenarioCount',
      label: 'Số kịch bản đề xuất',
      type: 'select',
      options: [
        { label: '2 kịch bản', value: '2' },
        { label: '3 kịch bản', value: '3' },
        { label: '4 kịch bản', value: '4' },
      ],
      defaultValue: '3',
    },
  ],
  outputFormat: 'markdown',
  model: 'groq',
  temperature: 0.7,
  maxTokens: 4096,
  affiliateTrackingId: 'demo-a',
  affiliateCtaLabel: 'Tạo video Veo 3 tự động',
  affiliateCtaDescription: 'Dùng URL → Video để render MP4 9:16 từ cùng link sản phẩm.',
  seo: {
    howToUse: [
      'Dán link sản phẩm TikTok Shop hoặc trang landing affiliate.',
      'Chọn ngôn ngữ và số kịch bản — mặc định gồm hook 3s (thu hút, tò mò, gây sốc…).',
      'Copy prompt Veo 3 (tiếng Anh) hoặc chuyển sang URL → Video để render.',
    ],
    examples: [
      {
        title: 'Serum skincare TikTok Shop',
        input: {
          productUrl: 'https://www.tiktok.com/@shop/product/123',
          language: 'vi',
          scenarioCount: '3',
        },
        outputPreview:
          '### UGC Review tự nhiên (8s)\n**Veo 3 prompt:** Vertical 9:16 TikTok Shop affiliate...',
      },
    ],
    faq: [
      {
        q: 'Prompt Veo 3 dùng ở đâu?',
        a: 'Copy vào Google AI Studio / Gemini API Veo, hoặc dùng công cụ URL → Video trên nền tảng này.',
      },
      {
        q: 'Có cần API key không?',
        a: 'Tạo kịch bản dùng Groq/Gemini free tier. Render video Veo 3 cần GEMINI_API_KEY (trả phí).',
      },
    ],
  },
  relatedToolKeys: ['url-to-video', 'tiktok-product-rank'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeTiktokVeoPrompt,
};

export const imagePromptTool: AiToolDefinition = {
  toolKey: 'image-prompt',
  slug: 'ai-image-prompt-generator',
  name: 'AI Image Prompt Generator',
  description: 'Tạo prompt chi tiết cho Midjourney, DALL·E, Stable Diffusion.',
  category: 'creative',
  categoryLabel: 'Creative',
  implemented: true,
  inputFields: [
    { name: 'subject', label: 'Chủ thể chính', type: 'text', placeholder: 'VD: futuristic city at sunset', required: true },
    {
      name: 'style',
      label: 'Phong cách',
      type: 'select',
      options: [
        { label: 'Photorealistic', value: 'photorealistic' },
        { label: 'Anime', value: 'anime' },
        { label: '3D render', value: '3d' },
        { label: 'Watercolor', value: 'watercolor' },
      ],
      defaultValue: 'photorealistic',
    },
    { name: 'mood', label: 'Mood / ánh sáng', type: 'text', placeholder: 'VD: cinematic, golden hour', required: false },
    {
      name: 'platform',
      label: 'Platform',
      type: 'select',
      options: [
        { label: 'Midjourney', value: 'midjourney' },
        { label: 'DALL·E', value: 'dalle' },
        { label: 'Stable Diffusion', value: 'sd' },
      ],
      defaultValue: 'midjourney',
    },
  ],
  outputFormat: 'plain',
  model: 'gpt-4o-mini',
  temperature: 0.6,
  maxTokens: 800,
  seo: {
    howToUse: [
      'Mô tả chủ thể và chọn style.',
      'Copy prompt vào tool AI image bạn dùng.',
      'Iterate với variations.',
    ],
    examples: [
      {
        title: 'Portrait cyberpunk',
        input: { subject: 'cyberpunk samurai portrait', style: 'photorealistic', platform: 'midjourney' },
        outputPreview: 'cyberpunk samurai, neon rim light, 85mm lens, f/1.4...',
      },
    ],
    faq: [{ q: 'Prompt có dùng được cho Midjourney v6?', a: 'Có, chọn platform Midjourney để tối ưu syntax.' }],
  },
  relatedToolKeys: ['tiktok-script', 'product-description'],
  systemPrompt: `You are an expert AI image prompt engineer. Output a single optimized prompt in English.
Include subject, style, lighting, camera/lens if photorealistic, and quality tokens appropriate for the platform.
No markdown, no explanation — prompt text only.`,
  buildUserPrompt: (input) =>
    `Subject: ${input.subject}
Style: ${input.style}
${input.mood ? `Mood/lighting: ${input.mood}` : ''}
Platform: ${input.platform}`,
};

export const resumeBuilderTool: AiToolDefinition = {
  toolKey: 'resume-builder',
  slug: 'ai-resume-builder',
  name: 'AI Resume Builder',
  description: 'Tạo bullet points CV theo chuẩn ATS — sắp ra mắt.',
  category: 'career',
  categoryLabel: 'Career',
  implemented: false,
  inputFields: [
    { name: 'role', label: 'Vị trí ứng tuyển', type: 'text', required: true },
    { name: 'experience', label: 'Kinh nghiệm (tóm tắt)', type: 'textarea', rows: 4, required: true },
  ],
  outputFormat: 'markdown',
  seo: {
    howToUse: ['Nhập role và kinh nghiệm.', 'Generate bullet points.', 'Paste vào CV template.'],
    examples: [],
    faq: [{ q: 'Khi nào ra mắt?', a: 'Tool đang trong giai đoạn phát triển.' }],
  },
  relatedToolKeys: ['blog-writer'],
  systemPrompt: 'You write ATS-friendly resume bullet points.',
  buildUserPrompt: (input) => `Role: ${input.role}\nExperience: ${input.experience}`,
};

export const productDescriptionTool: AiToolDefinition = {
  toolKey: 'product-description',
  slug: 'ai-product-description-generator',
  name: 'AI Product Description Generator',
  description: 'Mô tả sản phẩm e-commerce chuẩn conversion — sắp ra mắt.',
  category: 'ecommerce',
  categoryLabel: 'E-commerce',
  implemented: false,
  inputFields: [
    { name: 'productName', label: 'Tên sản phẩm', type: 'text', required: true },
    { name: 'features', label: 'Tính năng chính', type: 'textarea', rows: 3, required: true },
  ],
  outputFormat: 'markdown',
  seo: {
    howToUse: ['Nhập tên và features.', 'Generate mô tả.', 'Dùng cho Shopify/WooCommerce.'],
    examples: [],
    faq: [],
  },
  relatedToolKeys: ['blog-writer', 'image-prompt'],
  systemPrompt: 'You write high-converting e-commerce product descriptions.',
  buildUserPrompt: (input) => `Product: ${input.productName}\nFeatures: ${input.features}`,
};

export const urlToVideoTool: AiToolDefinition = {
  toolKey: 'url-to-video',
  slug: 'ai-url-to-video',
  name: 'AI URL to Video — Affiliate',
  description:
    'Dán link sản phẩm → Groq/Gemini viết kịch bản + Veo 3 (Gemini API) tạo video TikTok affiliate MP4 có audio.',
  category: 'affiliate',
  categoryLabel: 'Affiliate',
  implemented: true,
  inputFields: [
    {
      name: 'productUrl',
      label: 'Link sản phẩm',
      type: 'text',
      placeholder: 'https://www.tiktok.com/... hoặc trang sản phẩm',
      required: true,
    },
    {
      name: 'language',
      label: 'Ngôn ngữ video',
      type: 'select',
      options: [
        { label: 'Tiếng Việt', value: 'vi' },
        { label: 'English', value: 'en' },
        { label: 'ภาษาไทย', value: 'th' },
        { label: 'Bahasa Indonesia', value: 'id' },
      ],
      defaultValue: 'vi',
    },
    {
      name: 'veoModel',
      label: 'Model Veo',
      type: 'select',
      options: [
        { label: 'Veo 3.1 Fast — nhanh, rẻ (khuyên dùng)', value: 'fast' },
        { label: 'Veo 3.1 Standard — chất lượng cao', value: 'standard' },
      ],
      defaultValue: 'fast',
    },
    {
      name: 'veoOutput',
      label: 'Độ dài video Veo',
      type: 'select',
      options: [
        { label: '8 giây — 1 clip, không extend (nhanh nhất)', value: 'clip-8s' },
        { label: 'Auto-extend theo thời lượng kịch bản', value: 'auto-extend' },
      ],
      defaultValue: 'clip-8s',
    },
    {
      name: 'duration',
      label: 'Thời lượng kịch bản (khi auto-extend)',
      type: 'select',
      options: [
        { label: '15 giây', value: '15' },
        { label: '30 giây', value: '30' },
        { label: '60 giây', value: '60' },
      ],
      defaultValue: '30',
    },
    {
      name: 'style',
      label: 'Phong cách video',
      type: 'select',
      options: [
        { label: 'UGC / Review tự nhiên', value: 'ugc-review' },
        { label: 'Unboxing nhanh', value: 'unboxing' },
        { label: 'Tutorial / How-to', value: 'tutorial' },
        { label: 'So sánh / Before-After', value: 'comparison' },
      ],
      defaultValue: 'ugc-review',
    },
    {
      name: 'targetAudience',
      label: 'Đối tượng mục tiêu (tùy chọn)',
      type: 'text',
      placeholder: 'VD: Gen Z thích deal TikTok Shop',
      required: false,
    },
    {
      name: 'sellingPoints',
      label: 'Điểm bán hàng (tùy chọn — AI tự trích nếu để trống)',
      type: 'textarea',
      rows: 3,
      placeholder: 'VD: Giá rẻ, ship nhanh, bảo hành 12 tháng',
      required: false,
    },
    {
      name: 'affiliateNote',
      label: 'Ghi chú affiliate / disclosure',
      type: 'text',
      placeholder: 'VD: Link Shopee affiliate, #quangcao',
      required: false,
    },
  ],
  outputFormat: 'markdown',
  model: 'llama-3.3-70b-versatile',
  provider: 'groq',
  temperature: 0.75,
  maxTokens: 4096,
  affiliateTrackingId: 'demo-a',
  affiliateCtaLabel: 'Nâng cấp hosting video',
  affiliateCtaDescription: 'Deploy production để render video nhanh hơn với queue + CDN.',
  seo: {
    howToUse: [
      'Dán link trang sản phẩm (TikTok Shop, Shopee, landing page affiliate).',
      'Chọn model Veo (Fast/Standard) và clip 8s hoặc auto-extend.',
      'Nhấn Tạo video — Veo 3 render MP4 9:16 có voiceover + nhạc nền.',
    ],
    examples: [
      {
        title: 'Sản phẩm TikTok Shop',
        input: {
          productUrl: 'https://example.com/product/serum',
          language: 'vi',
          duration: '30',
          style: 'ugc-review',
        },
        outputPreview:
          '## Điểm bán hàng cốt lõi\n1. Giảm mụn sau 7 ngày...\n\n## Kịch bản video (30s)\n| 0-3s | Hook... |',
      },
    ],
    faq: [
      {
        q: 'Tool có render video file không?',
        a: 'Có — dùng Google Veo 3 qua Gemini API. Mặc định: Veo Fast + clip 8s (1 lần gọi API). Chọn auto-extend để nối dài 15/30/60s.',
      },
      {
        q: 'Veo Fast vs Standard?',
        a: 'Fast (veo-3.1-fast-generate-preview): nhanh hơn, rẻ hơn. Standard: chất lượng cinematic cao hơn. Cấu hình mặc định qua VEO_MODEL trong .env.',
      },
      {
        q: 'Dùng AI nào?',
        a: 'Kịch bản: Groq (free) hoặc Gemini Flash. Video: Veo 3 — cần GEMINI_API_KEY paid preview.',
      },
      {
        q: 'Link FastMoss / aggregator có được không?',
        a: 'Có thể dùng nếu trang trả HTML công khai; nên dùng link sản phẩm trực tiếp để kết quả chính xác hơn.',
      },
    ],
  },
  relatedToolKeys: ['tiktok-script', 'product-description'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeUrlToVideo,
};

export const ALL_AI_TOOLS = [
  ...TIKTOK_ANALYTICS_TOOLS,
  blogWriterTool,
  tiktokScriptTool,
  imagePromptTool,
  urlToVideoTool,
  resumeBuilderTool,
  productDescriptionTool,
] as const;

export const AI_TOOL_MAP = Object.fromEntries(ALL_AI_TOOLS.map((t) => [t.toolKey, t])) as Record<
  string,
  AiToolDefinition
>;

export function getToolBySlug(slug: string): AiToolDefinition | undefined {
  return ALL_AI_TOOLS.find((t) => t.slug === slug);
}

export function getToolByKey(key: string): AiToolDefinition | undefined {
  return AI_TOOL_MAP[key];
}

export function getImplementedTools(): AiToolDefinition[] {
  return ALL_AI_TOOLS.filter((t) => t.implemented);
}

export function getRelatedTools(tool: AiToolDefinition): AiToolDefinition[] {
  return tool.relatedToolKeys
    .map((k) => AI_TOOL_MAP[k])
    .filter(Boolean) as AiToolDefinition[];
}

export const TOOL_CATEGORIES = [...new Set(ALL_AI_TOOLS.map((t) => t.category))];
