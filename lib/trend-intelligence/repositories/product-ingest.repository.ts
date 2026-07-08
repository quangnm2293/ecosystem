import type { ProductRankItem } from '@/lib/fastmoss/types';
import { TiktokProductStatus } from '@/lib/trend-intelligence/domain/enums';
import { metricsDailyRepository } from '@/lib/trend-intelligence/repositories/metrics-daily.repository';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';
import { computeScoresFromDaily } from '@/lib/trend-intelligence/scoring/compute-scores';
import { publishCategoryRanking } from '@/lib/trend-intelligence/scoring/publish-ranking';

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/g, '');
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

function tiktokIdFromUrl(url?: string, title?: string): string {
  if (url) {
    const m = url.match(/product\/(\d+)/) ?? url.match(/(\d{10,})/);
    if (m?.[1]) return m[1];
  }
  return `gen_${slugify(title ?? 'item')}`;
}

export type IngestRankedProductsInput = {
  region?: string;
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
    const region = 'VN';
    const db = getTiktokDb();
    const now = new Date().toISOString();
    const rankDate = input.rankDate ?? new Date().toISOString().slice(0, 10);
    const productIds: string[] = [];

    for (const [index, item] of input.items.slice(0, 50).entries()) {
      const slugBase = slugify(item.title);
      const tiktokId = tiktokIdFromUrl(item.productUrl, item.title);
      const productId = `prod_vn_${tiktokId}`;
      const suffix = slugify(tiktokId).slice(-8) || 'item';
      const slug = slugify(`${slugBase}-${suffix}`);
      const shopId = item.shopName ? `shop_${slugify(item.shopName)}` : null;
      const priceAmount = parseAmount(item.price);
      const commissionRate = parseCommissionRate(item.commissionPercent);
      const salesCount = parseAmount(item.sales7d) ?? 0;

      if (shopId && item.shopName) {
        await db.from('shops').upsert(
          {
            id: shopId,
            tiktok_id: null,
            name: item.shopName,
            region,
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
          region,
          price_amount: priceAmount,
          price_currency: 'VND',
          commission_rate: commissionRate,
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

      await metricsDailyRepository.upsertDay({
        productId,
        day: rankDate,
        salesCount,
        videoCount: 0,
        creatorCount: 0,
        viewCount: 0,
        priceAmount,
        commissionRate,
        source: input.source,
        raw: {
          growth: item.growth,
          revenue7d: item.revenue7d,
          seedRank: item.rank ?? index + 1,
        },
      });

      const series = await metricsDailyRepository.listForProduct(productId, 14);
      const scores = computeScoresFromDaily(series, {
        seedRank: item.rank ?? index + 1,
      });

      await db.from('product_metrics_current').upsert(
        {
          product_id: productId,
          sales_count: salesCount,
          sales_growth_7d: scores.salesGrowth7d,
          video_count: series[0]?.videoCount ?? 0,
          video_growth_7d: scores.videoGrowth7d,
          creator_count: series[0]?.creatorCount ?? 0,
          creator_growth_7d: scores.creatorGrowth7d,
          view_count: series[0]?.viewCount ?? 0,
          avg_commission: commissionRate,
          competition_score: scores.competitionScore,
          opportunity_score: scores.opportunityScore,
          trend_score: scores.trendScore,
          score_breakdown: scores.scoreBreakdown,
          calculated_at: now,
          updated_at: now,
        },
        { onConflict: 'product_id' },
      );

      productIds.push(productId);
    }

    const published = await publishCategoryRanking({
      categoryId: input.categoryId,
      rankDate,
      limit: 50,
    });

    return {
      productIds,
      rankingId: published.rankingId,
      itemCount: published.itemCount,
    };
  },
};
