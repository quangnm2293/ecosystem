import type { AiToolDefinition } from '@/modules/ai-tools/types';

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
  name: 'AI TikTok Script Generator',
  description: 'Tạo kịch bản TikTok/Reels hook mạnh, body ngắn và CTA trong 60 giây.',
  category: 'social',
  categoryLabel: 'Social Media',
  implemented: true,
  inputFields: [
    { name: 'topic', label: 'Chủ đề video', type: 'text', placeholder: 'VD: 3 tip tiết kiệm tiền', required: true },
    {
      name: 'style',
      label: 'Phong cách',
      type: 'select',
      options: [
        { label: 'Educational', value: 'educational' },
        { label: 'Storytelling', value: 'storytelling' },
        { label: 'Controversial hook', value: 'controversial' },
      ],
      defaultValue: 'educational',
    },
    { name: 'duration', label: 'Thời lượng (giây)', type: 'number', defaultValue: '60', required: true },
  ],
  outputFormat: 'markdown',
  model: 'gpt-4o-mini',
  temperature: 0.8,
  maxTokens: 1200,
  affiliateTrackingId: 'demo-a',
  affiliateCtaLabel: 'Thử CapCut Pro',
  seo: {
    howToUse: [
      'Nhập chủ đề video và chọn phong cách hook.',
      'Generate script với timestamp gợi ý.',
      'Quay theo script và A/B test hook đầu video.',
    ],
    examples: [
      {
        title: 'Video tip productivity',
        input: { topic: 'Làm việc 4h/ngày hiệu quả', style: 'controversial', duration: '45' },
        outputPreview: '**[0-3s HOOK]** Bạn đang lãng phí 4 tiếng mỗi ngày...',
      },
    ],
    faq: [
      { q: 'Script dài bao nhiêu?', a: 'Tùy duration bạn chọn, thường 100-200 từ cho 60 giây.' },
    ],
  },
  relatedToolKeys: ['blog-writer', 'image-prompt'],
  systemPrompt: `You write viral short-form video scripts. Format in markdown with sections:
HOOK (0-3s), BODY (with optional timestamps), CTA, ON-SCREEN TEXT suggestions.
Write in Vietnamese. Keep punchy sentences.`,
  buildUserPrompt: (input) =>
    `Create a TikTok script for: "${input.topic}"
Style: ${input.style}
Target duration: ${input.duration} seconds`,
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

export const ALL_AI_TOOLS = [
  blogWriterTool,
  tiktokScriptTool,
  imagePromptTool,
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
