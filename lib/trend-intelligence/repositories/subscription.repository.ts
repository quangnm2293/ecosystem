import { mapSubscription } from '@/lib/trend-intelligence/domain/mappers';
import { TiktokSubscriptionTier } from '@/lib/trend-intelligence/domain/enums';
import type { Subscription, SubscriptionRow } from '@/lib/trend-intelligence/domain/types';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';

export const subscriptionRepository = {
  async findByUserId(userId: string): Promise<Subscription | null> {
    const { data, error } = await getTiktokDb()
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapSubscription(data as SubscriptionRow) : null;
  },

  async getTierForUser(userId: string): Promise<TiktokSubscriptionTier> {
    const sub = await subscriptionRepository.findByUserId(userId);
    return sub?.tier ?? TiktokSubscriptionTier.FREE;
  },
};
