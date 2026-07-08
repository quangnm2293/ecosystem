import type {
  Category,
  Product,
  ProductMetrics,
  RankedProduct,
  TrendRanking,
  WatchlistItem,
} from '@/lib/trend-intelligence/domain/types';
import type { ProductWithMetrics } from '@/lib/trend-intelligence/repositories/product.repository';

export function serializeCategory(c: Category) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    parentId: c.parentId,
    region: c.region,
  };
}

export function serializeProductMetrics(m: ProductMetrics) {
  return {
    productId: m.productId,
    salesCount: m.salesCount,
    salesGrowth7d: m.salesGrowth7d,
    videoCount: m.videoCount,
    videoGrowth7d: m.videoGrowth7d,
    creatorCount: m.creatorCount,
    creatorGrowth7d: m.creatorGrowth7d,
    viewCount: m.viewCount,
    avgCommission: m.avgCommission,
    scores: {
      opportunityScore: m.scores.opportunityScore,
      trendScore: m.scores.trendScore,
      competitionScore: m.scores.competitionScore ?? null,
      scoreBreakdown: m.scores.scoreBreakdown,
      predictionLabel: m.scores.predictionLabel ?? null,
      predictionConfidence: m.scores.predictionConfidence ?? null,
      calculatedAt: m.scores.calculatedAt.toISOString(),
    },
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function serializeProduct(p: Product) {
  return {
    id: p.id,
    tiktokId: p.tiktokId,
    slug: p.slug,
    title: p.title,
    imageUrl: p.imageUrl,
    productUrl: p.productUrl,
    shopId: p.shopId,
    categoryId: p.categoryId,
    region: p.region,
    price: p.price,
    commissionRate: p.commissionRate,
    commissionType: p.commissionType,
    status: p.status,
    metadata: p.metadata,
    firstSeenAt: p.firstSeenAt.toISOString(),
    lastIngestedAt: p.lastIngestedAt?.toISOString() ?? null,
  };
}

export function serializeProductWithMetrics(p: ProductWithMetrics) {
  return {
    ...serializeProduct(p),
    metrics: p.metrics ? serializeProductMetrics(p.metrics) : null,
  };
}

export function serializeRankedProduct(p: RankedProduct) {
  return {
    ...serializeProduct(p),
    rank: p.rank,
    metrics: serializeProductMetrics(p.metrics),
  };
}

export function serializeRanking(r: TrendRanking) {
  return {
    id: r.id,
    rankDate: r.rankDate,
    region: r.region,
    categoryId: r.categoryId,
    publishedAt: r.publishedAt.toISOString(),
  };
}

export function serializeWatchlistItem(item: WatchlistItem) {
  return {
    id: item.id,
    productId: item.productId,
    notes: item.notes,
    addedAt: item.addedAt.toISOString(),
  };
}
