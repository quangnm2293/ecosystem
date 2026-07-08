import { coerceRegion } from '@/lib/trend-intelligence/domain/value-objects/region';
import { parseMoney } from '@/lib/trend-intelligence/domain/value-objects/money';
import { parseTrendScores } from '@/lib/trend-intelligence/domain/value-objects/scores';
import { parseSlug } from '@/lib/trend-intelligence/domain/value-objects/slug';
import type {
  Alert,
  AlertRow,
  Category,
  CategoryRow,
  CrawlJob,
  CrawlJobRow,
  Product,
  ProductMetrics,
  ProductMetricsRow,
  ProductRow,
  Shop,
  ShopRow,
  Subscription,
  SubscriptionRow,
  TrendRanking,
  TrendRankingItem,
  TrendRankingItemRow,
  TrendRankingRow,
  Watchlist,
  WatchlistItem,
  WatchlistItemRow,
  WatchlistRow,
} from '@/lib/trend-intelligence/domain/types';

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: parseSlug(row.slug),
    name: row.name,
    parentId: row.parent_id,
    region: row.region ? coerceRegion(row.region) : coerceRegion('VN'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapShop(row: ShopRow): Shop {
  return {
    id: row.id,
    tiktokId: row.tiktok_id,
    name: row.name,
    region: coerceRegion(row.region),
    metadata: row.metadata ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    tiktokId: row.tiktok_id,
    slug: parseSlug(row.slug),
    title: row.title,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    shopId: row.shop_id,
    categoryId: row.category_id,
    region: coerceRegion(row.region),
    price: parseMoney(row.price_amount, row.price_currency),
    commissionRate: row.commission_rate,
    commissionType: row.commission_type,
    status: row.status,
    metadata: row.metadata ?? {},
    firstSeenAt: new Date(row.first_seen_at),
    lastIngestedAt: row.last_ingested_at ? new Date(row.last_ingested_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapProductMetrics(row: ProductMetricsRow): ProductMetrics {
  if (row.opportunity_score == null || row.trend_score == null) {
    throw new Error(`Product ${row.product_id} has incomplete scores`);
  }

  return {
    productId: row.product_id,
    salesCount: row.sales_count,
    salesGrowth7d: row.sales_growth_7d,
    videoCount: row.video_count,
    videoGrowth7d: row.video_growth_7d,
    creatorCount: row.creator_count,
    creatorGrowth7d: row.creator_growth_7d,
    viewCount: row.view_count,
    avgCommission: row.avg_commission,
    scores: parseTrendScores({
      opportunityScore: row.opportunity_score,
      trendScore: row.trend_score,
      competitionScore: row.competition_score,
      scoreBreakdown: row.score_breakdown ?? {},
      predictionLabel: row.prediction_label,
      predictionConfidence: row.prediction_confidence,
      calculatedAt: row.calculated_at,
    }),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapTrendRanking(row: TrendRankingRow): TrendRanking {
  return {
    id: row.id,
    rankDate: row.rank_date,
    region: coerceRegion(row.region),
    categoryId: row.category_id,
    publishedAt: new Date(row.published_at),
    createdAt: new Date(row.created_at),
  };
}

export function mapTrendRankingItem(row: TrendRankingItemRow): TrendRankingItem {
  return {
    id: row.id,
    rankingId: row.ranking_id,
    productId: row.product_id,
    rank: row.rank,
    opportunityScore: row.opportunity_score,
    trendScore: row.trend_score,
    scoreBreakdown: row.score_breakdown ?? {},
    createdAt: new Date(row.created_at),
  };
}

export function mapWatchlist(row: WatchlistRow): Watchlist {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapWatchlistItem(row: WatchlistItemRow): WatchlistItem {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    productId: row.product_id,
    notes: row.notes,
    addedAt: new Date(row.added_at),
  };
}

export function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    userId: row.user_id,
    ruleType: row.rule_type,
    ruleParams: row.rule_params ?? {},
    channels: row.channels ?? [],
    channelConfig: row.channel_config ?? {},
    status: row.status,
    lastTriggered: row.last_triggered ? new Date(row.last_triggered) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapCrawlJob(row: CrawlJobRow): CrawlJob {
  return {
    id: row.id,
    source: row.source,
    params: row.params ?? {},
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    rawSnapshotUrl: row.raw_snapshot_url,
    errorMessage: row.error_message,
    parserVersion: row.parser_version,
    scheduledAt: new Date(row.scheduled_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    tier: row.tier,
    status: row.status,
    currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    stripeSubscriptionId: row.stripe_subscription_id,
    metadata: row.metadata ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
