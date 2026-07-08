import { z } from 'zod';

export const RegionQuerySchema = z.object({
  region: z.string().regex(/^[A-Z]{2}$/).default('VN'),
});

export const RankingsQuerySchema = z.object({
  region: z.string().regex(/^[A-Z]{2}$/).default('VN'),
  categorySlug: z.string().min(1).optional(),
  rankDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const ProductSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const ProductQuerySchema = z.object({
  region: z.string().regex(/^[A-Z]{2}$/).default('VN'),
});

export const WatchlistAddBodySchema = z.object({
  productId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const WatchlistRemoveQuerySchema = z.object({
  productId: z.string().min(1),
});

export const CrawlTickBodySchema = z.object({
  secret: z.string(),
  limit: z.number().int().min(1).max(10).optional(),
});

export const CrawlEnqueueBodySchema = z.object({
  secret: z.string(),
  region: z.string().regex(/^[A-Z]{2}$/).default('VN'),
  categorySlug: z.string().min(1).default('*'),
  period: z.enum(['1d', '7d', '30d']).default('7d'),
});
