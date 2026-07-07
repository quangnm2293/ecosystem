import { z } from 'zod';

/** 0–100 composite scores stored in product_metrics_current / ranking items */
export const ScoreValueSchema = z.number().min(0).max(100);

export const ScoreBreakdownSchema = z.record(z.string(), z.number());
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const TrendScoresSchema = z.object({
  opportunityScore: ScoreValueSchema,
  trendScore: ScoreValueSchema,
  competitionScore: ScoreValueSchema.nullable().optional(),
  scoreBreakdown: ScoreBreakdownSchema.default({}),
  predictionLabel: z.string().nullable().optional(),
  predictionConfidence: z.number().min(0).max(1).nullable().optional(),
  calculatedAt: z.coerce.date(),
});

export type TrendScores = z.infer<typeof TrendScoresSchema>;

export function parseTrendScores(input: {
  opportunityScore: number;
  trendScore: number;
  competitionScore?: number | null;
  scoreBreakdown?: Record<string, number>;
  predictionLabel?: string | null;
  predictionConfidence?: number | null;
  calculatedAt: Date | string;
}): TrendScores {
  return TrendScoresSchema.parse(input);
}
