import {
  mapProduct,
  mapProductMetrics,
  mapTrendRanking,
  mapTrendRankingItem,
} from '@/lib/trend-intelligence/domain/mappers';
import { TiktokProductStatus } from '@/lib/trend-intelligence/domain/enums';
import type {
  ProductMetricsRow,
  ProductRow,
  RankedProduct,
  TrendRanking,
  TrendRankingItemRow,
  TrendRankingRow,
} from '@/lib/trend-intelligence/domain/types';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export const rankingRepository = {
  async findLatest(options: {
    region: Region;
    categoryId?: string | null;
    rankDate?: string;
  }): Promise<TrendRanking | null> {
    let query = getTiktokDb()
      .from('trend_rankings')
      .select('*')
      .eq('region', options.region)
      .order('rank_date', { ascending: false })
      .limit(1);

    if (options.rankDate) {
      query = query.eq('rank_date', options.rankDate);
    }

    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId);
    } else {
      query = query.is('category_id', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? mapTrendRanking(data as TrendRankingRow) : null;
  },

  async listRankedProducts(rankingId: string): Promise<RankedProduct[]> {
    const { data: items, error: itemsError } = await getTiktokDb()
      .from('trend_ranking_items')
      .select('*')
      .eq('ranking_id', rankingId)
      .order('rank');

    if (itemsError) throw itemsError;
    if (!items?.length) return [];

    const rankingItems = (items as TrendRankingItemRow[]).map(mapTrendRankingItem);
    const productIds = rankingItems.map((i) => i.productId);

    const { data: products, error: productsError } = await getTiktokDb()
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('status', TiktokProductStatus.ACTIVE);

    if (productsError) throw productsError;

    const { data: metrics, error: metricsError } = await getTiktokDb()
      .from('product_metrics_current')
      .select('*')
      .in('product_id', productIds);

    if (metricsError) throw metricsError;

    const productMap = new Map((products as ProductRow[]).map((r) => [r.id, mapProduct(r)]));
    const metricsMap = new Map(
      (metrics as ProductMetricsRow[]).map((r) => [r.product_id, mapProductMetrics(r)]),
    );

    const ranked: RankedProduct[] = [];
    for (const item of rankingItems) {
      const product = productMap.get(item.productId);
      const productMetrics = metricsMap.get(item.productId);
      if (!product || !productMetrics) continue;

      ranked.push({
        ...product,
        metrics: productMetrics,
        rank: item.rank,
      });
    }

    return ranked;
  },
};
