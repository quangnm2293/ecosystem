export type DailyMetricPoint = {
  day: string;
  salesCount: number;
  videoCount: number;
  creatorCount: number;
  viewCount: number;
  priceAmount: number | null;
  commissionRate: number | null;
};

export type ScoreResult = {
  trendScore: number;
  opportunityScore: number;
  competitionScore: number;
  salesGrowth7d: number | null;
  videoGrowth7d: number | null;
  creatorGrowth7d: number | null;
  scoreBreakdown: Record<string, number>;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function growthPct(current: number, previous: number): number | null {
  if (previous <= 0 && current <= 0) return 0;
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function pointOnOrBefore(points: DailyMetricPoint[], dayOffset: number): DailyMetricPoint | null {
  if (points.length === 0) return null;
  const latest = new Date(points[0]!.day + 'T00:00:00Z');
  const target = new Date(latest);
  target.setUTCDate(target.getUTCDate() - dayOffset);
  const targetStr = target.toISOString().slice(0, 10);

  for (const p of points) {
    if (p.day <= targetStr) return p;
  }
  return points[points.length - 1] ?? null;
}

/**
 * Compute scores from daily series (newest first).
 * With 1 day of data, uses soft signals (price presence, commission) + mild baseline.
 */
export function computeScoresFromDaily(
  pointsNewestFirst: DailyMetricPoint[],
  options?: { seedRank?: number },
): ScoreResult {
  const today = pointsNewestFirst[0];
  if (!today) {
    return {
      trendScore: 50,
      opportunityScore: 50,
      competitionScore: 50,
      salesGrowth7d: null,
      videoGrowth7d: null,
      creatorGrowth7d: null,
      scoreBreakdown: { baseline: 50 },
    };
  }

  const d7 = pointOnOrBefore(pointsNewestFirst, 7);
  const d1 = pointOnOrBefore(pointsNewestFirst, 1);

  const salesGrowth7d =
    d7 && d7.day !== today.day ? growthPct(today.salesCount, d7.salesCount) : null;
  const salesGrowth1d =
    d1 && d1.day !== today.day ? growthPct(today.salesCount, d1.salesCount) : null;
  const videoGrowth7d =
    d7 && d7.day !== today.day ? growthPct(today.videoCount, d7.videoCount) : null;
  const creatorGrowth7d =
    d7 && d7.day !== today.day ? growthPct(today.creatorCount, d7.creatorCount) : null;

  const growthSignal = salesGrowth7d ?? salesGrowth1d ?? 0;
  const videoSignal = videoGrowth7d ?? 0;
  const seriesDepth = Math.min(pointsNewestFirst.length, 7);
  const depthBoost = (seriesDepth - 1) * 2;

  const rankBoost = options?.seedRank ? Math.max(0, (30 - options.seedRank) * 0.4) : 0;
  const commissionBoost = (today.commissionRate ?? 0) * 25;

  let trend = 50 + growthSignal * 0.35 + videoSignal * 0.15 + depthBoost + rankBoost;
  trend = clamp(trend);

  // Competition: higher creator/video density relative to sales ⇒ harder
  const engagement =
    today.salesCount > 0
      ? (today.creatorCount + today.videoCount) / Math.max(today.salesCount, 1)
      : (today.creatorCount + today.videoCount) * 0.1;
  const competition = clamp(40 + engagement * 8 + (options?.seedRank ? options.seedRank * 0.5 : 10));

  const opportunity = clamp(trend - competition * 0.25 + commissionBoost + depthBoost * 0.5);

  return {
    trendScore: round1(trend),
    opportunityScore: round1(opportunity),
    competitionScore: round1(competition),
    salesGrowth7d: salesGrowth7d != null ? round1(salesGrowth7d) : null,
    videoGrowth7d: videoGrowth7d != null ? round1(videoGrowth7d) : null,
    creatorGrowth7d: creatorGrowth7d != null ? round1(creatorGrowth7d) : null,
    scoreBreakdown: {
      growthSignal: round1(growthSignal),
      videoSignal: round1(videoSignal),
      depthBoost,
      rankBoost: round1(rankBoost),
      commissionBoost: round1(commissionBoost),
      seriesDays: seriesDepth,
    },
  };
}
