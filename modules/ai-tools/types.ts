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
};

/** Serializable subset safe to pass into Client Components */
export type AiToolPublic = Omit<AiToolDefinition, 'systemPrompt' | 'buildUserPrompt'>;

export function toPublicTool(tool: AiToolDefinition): AiToolPublic {
  const { systemPrompt: _systemPrompt, buildUserPrompt: _buildUserPrompt, ...publicTool } = tool;
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
};
