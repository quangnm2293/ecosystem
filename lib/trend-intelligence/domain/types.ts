import type {
  TiktokAlertStatus,
  TiktokCrawlStatus,
  TiktokNotificationStatus,
  TiktokProductStatus,
  TiktokSubscriptionStatus,
  TiktokSubscriptionTier,
} from '@/lib/trend-intelligence/domain/enums';
import type { Money } from '@/lib/trend-intelligence/domain/value-objects/money';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';
import type { ScoreBreakdown, TrendScores } from '@/lib/trend-intelligence/domain/value-objects/scores';
import type { Slug } from '@/lib/trend-intelligence/domain/value-objects/slug';

// ─── Row types (snake_case — Supabase tiktok schema) ─────────────────────────

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  region: string | null;
  created_at: string;
  updated_at: string;
};

export type ShopRow = {
  id: string;
  tiktok_id: string | null;
  name: string;
  region: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  tiktok_id: string;
  slug: string;
  title: string;
  image_url: string | null;
  product_url: string | null;
  shop_id: string | null;
  category_id: string | null;
  region: string;
  price_amount: number | null;
  price_currency: string;
  commission_rate: number | null;
  commission_type: string | null;
  status: TiktokProductStatus;
  metadata: Record<string, unknown>;
  first_seen_at: string;
  last_ingested_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductMetricsRow = {
  product_id: string;
  sales_count: number;
  sales_growth_7d: number | null;
  video_count: number;
  video_growth_7d: number | null;
  creator_count: number;
  creator_growth_7d: number | null;
  view_count: number;
  avg_commission: number | null;
  competition_score: number | null;
  trend_score: number | null;
  opportunity_score: number | null;
  score_breakdown: ScoreBreakdown;
  prediction_label: string | null;
  prediction_confidence: number | null;
  calculated_at: string;
  updated_at: string;
};

export type TrendRankingRow = {
  id: string;
  rank_date: string;
  region: string;
  category_id: string | null;
  published_at: string;
  created_at: string;
};

export type TrendRankingItemRow = {
  id: string;
  ranking_id: string;
  product_id: string;
  rank: number;
  opportunity_score: number;
  trend_score: number;
  score_breakdown: ScoreBreakdown;
  created_at: string;
};

export type WatchlistRow = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type WatchlistItemRow = {
  id: string;
  watchlist_id: string;
  product_id: string;
  notes: string | null;
  added_at: string;
};

export type AlertRow = {
  id: string;
  user_id: string;
  rule_type: string;
  rule_params: Record<string, unknown>;
  channels: string[];
  channel_config: Record<string, unknown>;
  status: TiktokAlertStatus;
  last_triggered: string | null;
  created_at: string;
  updated_at: string;
};

export type CrawlJobRow = {
  id: string;
  source: string;
  params: Record<string, unknown>;
  status: TiktokCrawlStatus;
  attempts: number;
  max_attempts: number;
  raw_snapshot_url: string | null;
  error_message: string | null;
  parser_version: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  tier: TiktokSubscriptionTier;
  status: TiktokSubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ─── Domain entities (camelCase) ─────────────────────────────────────────────

export type Category = {
  id: string;
  slug: Slug;
  name: string;
  parentId: string | null;
  region: Region | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Shop = {
  id: string;
  tiktokId: string | null;
  name: string;
  region: Region;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: string;
  tiktokId: string;
  slug: Slug;
  title: string;
  imageUrl: string | null;
  productUrl: string | null;
  shopId: string | null;
  categoryId: string | null;
  region: Region;
  price: Money | null;
  commissionRate: number | null;
  commissionType: string | null;
  status: TiktokProductStatus;
  metadata: Record<string, unknown>;
  firstSeenAt: Date;
  lastIngestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductMetrics = {
  productId: string;
  salesCount: number;
  salesGrowth7d: number | null;
  videoCount: number;
  videoGrowth7d: number | null;
  creatorCount: number;
  creatorGrowth7d: number | null;
  viewCount: number;
  avgCommission: number | null;
  scores: TrendScores;
  updatedAt: Date;
};

export type TrendRanking = {
  id: string;
  rankDate: string;
  region: Region;
  categoryId: string | null;
  publishedAt: Date;
  createdAt: Date;
};

export type TrendRankingItem = {
  id: string;
  rankingId: string;
  productId: string;
  rank: number;
  opportunityScore: number;
  trendScore: number;
  scoreBreakdown: ScoreBreakdown;
  createdAt: Date;
};

export type Watchlist = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WatchlistItem = {
  id: string;
  watchlistId: string;
  productId: string;
  notes: string | null;
  addedAt: Date;
};

export type Alert = {
  id: string;
  userId: string;
  ruleType: string;
  ruleParams: Record<string, unknown>;
  channels: string[];
  channelConfig: Record<string, unknown>;
  status: TiktokAlertStatus;
  lastTriggered: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CrawlJob = {
  id: string;
  source: string;
  params: Record<string, unknown>;
  status: TiktokCrawlStatus;
  attempts: number;
  maxAttempts: number;
  rawSnapshotUrl: string | null;
  errorMessage: string | null;
  parserVersion: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type Subscription = {
  id: string;
  userId: string;
  tier: TiktokSubscriptionTier;
  status: TiktokSubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

/** Product + current metrics — primary API read model */
export type RankedProduct = Product & {
  metrics: ProductMetrics;
  rank: number;
};

export type NotificationLogRow = {
  id: string;
  alert_id: string | null;
  user_id: string;
  channel: string;
  status: TiktokNotificationStatus;
  payload: Record<string, unknown>;
  sent_at: string;
};
