import {
  getAdInsights,
  getCreatorProfile,
  getHashtagTrends,
  getLiveRank,
  getMarketTrends,
  getProductRank,
  getShopAnalytics,
  getVideoAnalytics,
  getVocAnalysis,
} from '@/lib/fastmoss/service';
import {
  formatAds,
  formatCreator,
  formatHashtags,
  formatLiveRank,
  formatMarketTrends,
  formatProductRank,
  formatShop,
  formatVideo,
  formatVoc,
} from '@/modules/tiktok-analytics/format';
import { normalizeProductRankList } from '@/lib/fastmoss/normalize';
import type { RankPeriod } from '@/lib/fastmoss/types';
import type { ToolCustomResult, ToolStructuredResult } from '@/modules/ai-tools/types';

const VN = 'VN' as const;

function result(output: string, source: string): ToolCustomResult {
  return { output, model: source };
}

export async function executeProductRank(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getProductRank({
    region: VN,
    category: input.category || 'beauty',
    period: (input.period as RankPeriod) || '7d',
    productUrl: input.productUrl?.trim() || undefined,
  });
  const items = normalizeProductRankList(r.data);
  const structured: ToolStructuredResult = {
    kind: 'tiktok-product-rank',
    source: r.source,
    fetchedAt: r.fetchedAt,
    note: r.note,
    items,
  };
  return {
    output: formatProductRank({ ...r, data: items }),
    model: r.source,
    structured,
  };
}

export async function executeMarketTrends(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getMarketTrends({
    region: VN,
    category: input.category || 'beauty',
  });
  return result(formatMarketTrends(r), r.source);
}

export async function executeCreatorLookup(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getCreatorProfile(input.handle || '');
  return result(formatCreator(r), r.source);
}

export async function executeShopAnalytics(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getShopAnalytics(input.shopQuery || input.shopUrl || '');
  return result(formatShop(r), r.source);
}

export async function executeLiveRank(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getLiveRank({
    region: VN,
    period: (input.period as RankPeriod) || '7d',
  });
  return result(formatLiveRank(r), r.source);
}

export async function executeVideoAnalytics(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getVideoAnalytics(input.videoUrl || '');
  return result(formatVideo(r), r.source);
}

export async function executeHashtagTrends(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getHashtagTrends({
    region: VN,
    keyword: input.keyword?.trim() || undefined,
  });
  return result(formatHashtags(r), r.source);
}

export async function executeAdInsights(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getAdInsights({
    keyword: input.keyword || '',
    region: VN,
  });
  return result(formatAds(r), r.source);
}

export async function executeVocAnalysis(input: Record<string, string>): Promise<ToolCustomResult> {
  const r = await getVocAnalysis(input.productUrl || '');
  return result(formatVoc(r), r.source);
}
