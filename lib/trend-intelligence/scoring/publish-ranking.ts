import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export type ScoredProductRow = {
  product_id: string;
  opportunity_score: number;
  trend_score: number;
  score_breakdown: Record<string, number>;
};

/**
 * Publish daily ranking for a VN category from product_metrics_current
 * ordered by opportunity_score (not crawl order).
 */
export async function publishCategoryRanking(options: {
  categoryId: string;
  rankDate?: string;
  limit?: number;
}): Promise<{ rankingId: string; itemCount: number }> {
  const region = 'VN';
  const rankDate = options.rankDate ?? new Date().toISOString().slice(0, 10);
  const limit = options.limit ?? 50;
  const db = getTiktokDb();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from('product_metrics_current')
    .select('product_id, opportunity_score, trend_score, score_breakdown, products!inner(id, category_id, region, status)')
    .eq('products.category_id', options.categoryId)
    .eq('products.region', region)
    .eq('products.status', 'ACTIVE')
    .not('opportunity_score', 'is', null)
    .order('opportunity_score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    product_id: string;
    opportunity_score: number;
    trend_score: number;
    score_breakdown: Record<string, number>;
  }>;

  const rankingId = `rank_VN_${options.categoryId}_${rankDate}`;

  await db.from('trend_rankings').upsert(
    {
      id: rankingId,
      rank_date: rankDate,
      region,
      category_id: options.categoryId,
      published_at: now,
    },
    { onConflict: 'id' },
  );

  await db.from('trend_ranking_items').delete().eq('ranking_id', rankingId);

  if (rows.length > 0) {
    const { error: insertError } = await db.from('trend_ranking_items').insert(
      rows.map((row, i) => ({
        id: crypto.randomUUID(),
        ranking_id: rankingId,
        product_id: row.product_id,
        rank: i + 1,
        opportunity_score: row.opportunity_score,
        trend_score: row.trend_score,
        score_breakdown: row.score_breakdown ?? {},
        created_at: now,
      })),
    );
    if (insertError) throw insertError;
  }

  return { rankingId, itemCount: rows.length };
}
