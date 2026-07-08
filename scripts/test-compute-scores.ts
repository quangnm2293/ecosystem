import { computeScoresFromDaily, type DailyMetricPoint } from '@/lib/trend-intelligence/scoring/compute-scores';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const singleDay: DailyMetricPoint[] = [
  {
    day: '2026-07-08',
    salesCount: 100,
    videoCount: 5,
    creatorCount: 2,
    viewCount: 1000,
    priceAmount: 99000,
    commissionRate: 0.15,
  },
];

const s1 = computeScoresFromDaily(singleDay, { seedRank: 1 });
assert(s1.trendScore >= 0 && s1.trendScore <= 100, 'trend in range');
assert(s1.opportunityScore >= 0 && s1.opportunityScore <= 100, 'opp in range');
assert(s1.salesGrowth7d == null, 'no 7d growth with 1 day');
console.log('single-day OK', s1.trendScore, s1.opportunityScore);

const series: DailyMetricPoint[] = [
  { day: '2026-07-08', salesCount: 200, videoCount: 10, creatorCount: 4, viewCount: 2000, priceAmount: 99000, commissionRate: 0.1 },
  { day: '2026-07-01', salesCount: 100, videoCount: 5, creatorCount: 2, viewCount: 1000, priceAmount: 99000, commissionRate: 0.1 },
];

const s2 = computeScoresFromDaily(series, { seedRank: 5 });
assert(s2.salesGrowth7d === 100, `expected +100% growth, got ${s2.salesGrowth7d}`);
assert(s2.trendScore > s1.trendScore, 'multi-day trend should rise with growth');
console.log('series OK', s2.salesGrowth7d, s2.trendScore, s2.opportunityScore, s2.scoreBreakdown);

console.log('compute-scores PASS');
