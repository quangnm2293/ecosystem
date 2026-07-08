import { TiktokSubscriptionTier } from '@/lib/trend-intelligence/domain/enums';

export const WATCHLIST_LIMIT: Record<TiktokSubscriptionTier, number> = {
  [TiktokSubscriptionTier.FREE]: 10,
  [TiktokSubscriptionTier.PRO]: 50,
  [TiktokSubscriptionTier.AGENCY]: 200,
  [TiktokSubscriptionTier.ENTERPRISE]: 1000,
};

export const ALERT_LIMIT: Record<TiktokSubscriptionTier, number> = {
  [TiktokSubscriptionTier.FREE]: 3,
  [TiktokSubscriptionTier.PRO]: 20,
  [TiktokSubscriptionTier.AGENCY]: 100,
  [TiktokSubscriptionTier.ENTERPRISE]: 500,
};

/** Free tier: max API mutations per hour (watchlist add / create alert). */
export const FREE_MUTATION_RATE_LIMIT_PER_HOUR = 30;
