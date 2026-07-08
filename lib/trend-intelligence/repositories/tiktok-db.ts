import { getSupabaseAdmin } from '@/lib/supabase/admin';

/** Service-role client scoped to `tiktok` schema. Requires schema exposed in Supabase API Settings. */
export function getTiktokDb() {
  return getSupabaseAdmin().schema('tiktok');
}
