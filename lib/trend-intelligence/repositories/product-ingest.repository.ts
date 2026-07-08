import type { ProductRankItem } from '@/lib/fastmoss/types';
import { TiktokProductStatus } from '@/lib/trend-intelligence/domain/enums';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return base || 'product';
}

function parseAmount(price?: string): number | null {
  if (!price) return null;
  const digits = price.replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number.parseInt(digits, 10);
}

function parsePercent(value?: string): number | null {
  if (!value) return null;
  const m = value.match(/-?\d+(\.\d+)?/);
  return m ? Number.parseFloat(m[0]) : null;
}

function parseCommissionRate(commissionPercent?: string): number | null {
  const pct = parsePercent(commissionPercent);
  if (pct == null) return null;
  return pct > 1 ? pct / 100 : pct;
}

function scoreFromGrowth(growth?: string, rank?: number): { opportunity: number; trend: number } {
  const growthNum = parsePercent(growth) ?? 0;
  const rankBoost = rank ? Math.max(0, 30 - rank) : 10;
  const trend = Math.min(100, Math.max(0, 50 + growthNum + rankBoost * 0.5));
  const opportunity = Math.min(100, Math.max(0, trend + growthNum * 0.3));
  return { opportunity: Math.round(opportunity * 10) / 10, trend: Math.round(trend * 10) / 10 };
}

function tiktokIdFromUrl(url?: string, title?: string): string {
  if (url) {
    const m = url.match(/product\/(\d+)/) ?? url.match(/(\d{10,})/);
    if (m?.[1]) return m[1];
  }
  return `gen_${slugify(title ?? 'item')}`;
}

export type IngestRankedProductsInput = {
  region: string;
  categoryId: string;
  items: ProductRankItem[];
  source: string;
  rankDate?: string;
};

export type IngestRankedProductsResult = {
  productIds: string[];
  rankingId: string;
  itemCount: number;
};

export const productIngestRepository = {
  async ingestRankedProducts(input: IngestRankedProductsInput): Promise<IngestRankedProductsResult> {
    const db = getTiktokDb();
    const now = new Date().toISOString();
    const rankDate = input.rankDate ?? new Date().toISOString().slice(0, 10);
    const productIds: string[] = [];
    const rankingItems: Array<{
      id: string;
      product_id: string;
      rank: number;
      opportunity_score: number;
      trend_score: number;
      score_breakdown: Record<string, number>;
    }> = [];

    for (const item of input.items.slice(0, 50)) {
      const slugBase = slugify(item.title);
      const tiktokId = tiktokIdFromUrl(item.productUrl, item.title);
      const productId = `prod_${input.region.toLowerCase()}_${tiktokId}`;
      const slug = `${slugBase}-${tiktokId.slice(-6)}`;
      const shopId = item.shopName ? `shop_${slugify(item.shopName)}` : null;
      const scores = scoreFromGrowth(item.growth, item.rank);

      if (shopId && item.shopName) {
        await db.from('shops').upsert(
          {
            id: shopId,
            tiktok_id: null,
            name: item.shopName,
            region: input.region,
            metadata: {},
            updated_at: now,
          },
          { onConflict: 'id' },
        );
      }

      await db.from('products').upsert(
        {
          id: productId,
          tiktok_id: tiktokId,
          slug,
          title: item.title,
          image_url: item.imageUrl ?? null,
          product_url: item.productUrl ?? null,
          shop_id: shopId,
          category_id: input.categoryId,
          region: input.region,
          price_amount: parseAmount(item.price),
          price_currency: 'VND',
          commission_rate: parseCommissionRate(item.commissionPercent),
          commission_type: item.commissionPercent ? 'percent' : null,
          status: TiktokProductStatus.ACTIVE,
          metadata: {
            source: input.source,
            sales7d: item.sales7d,
            revenue7d: item.revenue7d,
            growth: item.growth,
          },
          last_ingested_at: now,
          updated_at: now,
        },
        { onConflict: 'id' },
      );

      await db.from('product_metrics_current').upsert(
        {
          product_id: productId,
          sales_count: parseAmount(item.sales7d) ?? 0,
          video_count: 0,
          creator_count: 0,
          view_count: 0,
          opportunity_score: scores.opportunity,
          trend_score: scores.trend,
          score_breakdown: { growth: parsePercent(item.growth) ?? 0, rank: item.rank },
          calculated_at: now,
          updated_at: now,
        },
        { onConflict: 'product_id' },
      );

      productIds.push(productId);
      rankingItems.push({
        id: crypto.randomUUID(),
        product_id: productId,
        rank: item.rank,
        opportunity_score: scores.opportunity,
        trend_score: scores.trend,
        score_breakdown: { growth: parsePercent(item.growth) ?? 0 },
      });
    }

    const rankingId = `rank_${input.region}_${input.categoryId}_${rankDate}`;
    await db.from('trend_rankings').upsert(
      {
        id: rankingId,
        rank_date: rankDate,
        region: input.region,
        category_id: input.categoryId,
        published_at: now,
      },
      { onConflict: 'id' },
    );

    await db.from('trend_ranking_items').delete().eq('ranking_id', rankingId);

    if (rankingItems.length > 0) {
      const { error } = await db.from('trend_ranking_items').insert(
        rankingItems.map((ri) => ({
          id: ri.id,
          ranking_id: rankingId,
          product_id: ri.product_id,
          rank: ri.rank,
          opportunity_score: ri.opportunity_score,
          trend_score: ri.trend_score,
          score_breakdown: ri.score_breakdown,
          created_at: now,
        })),
      );
      if (error) throw error;
    }

    return { productIds, rankingId, itemCount: rankingItems.length };
  },
};
