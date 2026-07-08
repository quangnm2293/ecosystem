import { TiktokSubscriptionTier } from '@/lib/trend-intelligence/domain/enums';

export const WATCHLIST_LIMIT: Record<TiktokSubscriptionTier, number> = {
  [TiktokSubscriptionTier.FREE]: 10,
  [TiktokSubscriptionTier.PRO]: 50,
  [TiktokSubscriptionTier.AGENCY]: 200,
  [TiktokSubscriptionTier.ENTERPRISE]: 1000,
};
