import { z } from 'zod';

export const InputFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'select', 'number']),
  placeholder: z.string().optional(),
  required: z.boolean().default(true),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  defaultValue: z.string().optional(),
  rows: z.number().optional(),
});

export const ToolSeoSchema = z.object({
  howToUse: z.array(z.string()).min(1),
  examples: z
    .array(
      z.object({
        title: z.string(),
        input: z.record(z.string(), z.string()),
        outputPreview: z.string(),
      }),
    )
    .default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
});

export const AiToolMetadataSchema = z.object({
  toolKey: z.string(),
  category: z.string(),
  categoryLabel: z.string().optional(),
  inputFields: z.array(InputFieldSchema),
  outputFormat: z.enum(['markdown', 'plain']).default('markdown'),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  affiliateTrackingId: z.string().optional(),
  affiliateCtaLabel: z.string().optional(),
  affiliateCtaDescription: z.string().optional(),
  seo: ToolSeoSchema,
  relatedToolKeys: z.array(z.string()).default([]),
});

export type InputField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  rows?: number;
};
export type ToolSeoContent = z.infer<typeof ToolSeoSchema>;
export type AiToolMetadata = z.infer<typeof AiToolMetadataSchema>;

/** Code registry extends DB metadata with prompt template (never stored in DB) */
export type AiToolDefinition = Omit<AiToolMetadata, 'inputFields'> & {
  slug: string;
  name: string;
  description: string;
  inputFields: InputField[];
  systemPrompt: string;
  buildUserPrompt: (input: Record<string, string>) => string;
  implemented: boolean;
  /** Override default AI provider (openai | gemini | mock) */
  provider?: string;
  /** Custom server-side executor — bypasses generic prompt → LLM flow */
  customExecute?: (input: Record<string, string>) => Promise<string | ToolCustomResult>;
};

export type ToolStructuredResult =
  | {
      kind: 'tiktok-product-rank';
      source: string;
      fetchedAt: string;
      note?: string;
      items: {
        rank: number;
        title: string;
        category?: string;
        price?: string;
        sales7d?: string;
        revenue7d?: string;
        growth?: string;
        shopName?: string;
        imageUrl?: string;
        productUrl?: string;
        commissionPercent?: string;
      }[];
    }
  | {
      kind: 'veo-prompt-scripts';
      productTitle: string;
      productUrl: string;
      imageUrl?: string;
      price?: string;
      sellingPoints: string[];
      productInsights?: {
        productSummary: string;
        category?: string;
        targetAudience?: string;
        painPoints: string[];
        benefits: string[];
        uniqueSellingPoints: string[];
        keywords?: string[];
        hookAngles: {
          angle: string;
          rationale: string;
          sampleHook: string;
        }[];
      };
      scenarios: {
        id: string;
        title: string;
        style: string;
        durationSec: 4 | 6 | 8;
        hook: string;
        scenes: {
          durationSec: number;
          visual: string;
          voiceover?: string;
          onScreenText?: string;
        }[];
        veoPrompt: string;
        caption: string;
        hashtags: string[];
        cta?: string;
      }[];
      veoTips?: string[];
    };

export type ToolCustomResult = {
  output: string;
  videoUrl?: string;
  model?: string;
  structured?: ToolStructuredResult;
};

/** Serializable subset safe to pass into Client Components */
export type AiToolPublic = Omit<
  AiToolDefinition,
  'systemPrompt' | 'buildUserPrompt' | 'customExecute' | 'provider'
>;

export function toPublicTool(tool: AiToolDefinition): AiToolPublic {
  const {
    systemPrompt: _systemPrompt,
    buildUserPrompt: _buildUserPrompt,
    customExecute: _customExecute,
    provider: _provider,
    ...publicTool
  } = tool;
  return publicTool;
}

export type ToolExecuteRequest = {
  toolKey: string;
  input: Record<string, string>;
  visitorId?: string;
  sessionId?: string;
  contentId?: string;
};

export type ToolExecuteResponse = {
  output: string;
  cached: boolean;
  model: string;
  videoUrl?: string;
  structured?: ToolStructuredResult;
};
