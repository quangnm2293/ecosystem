import { z } from 'zod';

/** Type-specific metadata — validate khi write, không cần migrate DB khi thêm field */
export const BlogMetadataSchema = z.object({
  author: z.string().optional(),
  readingTimeMin: z.number().optional(),
  tags: z.array(z.string()).default([]),
});

export const ToolMetadataSchema = z.object({
  toolKey: z.string(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  isPremium: z.boolean().default(false),
});

export const CompareMetadataSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      affiliateTrackingId: z.string().optional(),
      pros: z.array(z.string()).default([]),
      cons: z.array(z.string()).default([]),
    }),
  ),
  winnerIndex: z.number().optional(),
});

export const GameMetadataSchema = z.object({
  gameKey: z.string(),
  embedUrl: z.string().url().optional(),
  width: z.number().default(800),
  height: z.number().default(600),
});

export type BlogMetadata = z.infer<typeof BlogMetadataSchema>;
export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;
export type CompareMetadata = z.infer<typeof CompareMetadataSchema>;
export type GameMetadata = z.infer<typeof GameMetadataSchema>;
