import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { mapAffiliateLink, type AffiliateLink, type AffiliateLinkRow } from '@/lib/supabase/types';

export const affiliateRepository = {
  async findByTrackingId(trackingId: string): Promise<AffiliateLink | null> {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('affiliate_links')
      .select('*')
      .eq('tracking_id', trackingId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;
    return mapAffiliateLink(data as AffiliateLinkRow);
  },
};
