import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/env';

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client — ALL server writes (API routes, ingest, tracking).
 * Bypasses RLS. Never expose to browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}
