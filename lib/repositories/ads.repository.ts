import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { AdSlotConfig } from '@/lib/ads/placements';

export const adsRepository = {
  async getPlacement(slotKey: string): Promise<AdSlotConfig | null> {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('ad_placements')
      .select('config')
      .eq('slot_key', slotKey)
      .eq('is_active', true)
      .maybeSingle();

    if (!data?.config) return null;
    return data.config as AdSlotConfig;
  },
};
