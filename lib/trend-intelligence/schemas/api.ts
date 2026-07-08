import { z } from 'zod';
import { SUPPORTED_REGION } from '@/lib/trend-intelligence/domain/value-objects/region';

const RegionField = z
  .string()
  .optional()
  .transform(() => SUPPORTED_REGION)
  .pipe(z.literal(SUPPORTED_REGION));

export const RegionQuerySchema = z.object({
  region: RegionField.default(SUPPORTED_REGION),
});

export const RankingsQuerySchema = z.object({
  region: RegionField.default(SUPPORTED_REGION),
  categorySlug: z.string().min(1).optional(),
  rankDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const ProductSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const ProductQuerySchema = z.object({
  region: RegionField.default(SUPPORTED_REGION),
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
  limit: z.number().int().min(1).max(20).optional(),
  autoEnqueue: z.boolean().optional(),
});

export const CrawlEnqueueBodySchema = z.object({
  secret: z.string(),
  region: RegionField.default(SUPPORTED_REGION),
  categorySlug: z.string().min(1).default('*'),
  period: z.enum(['1d', '7d', '30d']).default('7d'),
});

export const AlertCreateBodySchema = z.object({
  ruleType: z.literal('opportunity_above').default('opportunity_above'),
  threshold: z.number().min(0).max(100).default(70),
  productId: z.string().min(1).optional(),
  channels: z.array(z.string()).optional(),
});

export const AdminRequeueBodySchema = z.object({
  secret: z.string(),
  jobId: z.string().min(1),
});

export const AdminJobsQuerySchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
