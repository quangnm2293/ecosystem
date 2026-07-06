const JWT_PREFIX = 'eyJ';

/** Trim + bỏ quote thừa khi paste env trên Vercel. */
export function sanitizeEnvValue(raw: string | undefined): string {
  if (!raw) return '';
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function getSupabaseUrl(): string {
  const url = sanitizeEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  );
  if (!url) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL');
  }
  return url.replace(/\/$/, '');
}

export function getSupabaseAnonKey(): string {
  const key = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!key) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (!key.startsWith(JWT_PREFIX) && !key.startsWith('sb_publishable_')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY không hợp lệ — dùng anon/public key từ Supabase Dashboard → Settings → API',
    );
  }
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) {
    throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY');
  }
  return key;
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  return { url: getSupabaseUrl(), anonKey: getSupabaseAnonKey() };
}

export async function probeSupabaseAuthHealth(): Promise<{
  ok: boolean;
  status: number;
  host: string;
  error?: string;
}> {
  try {
    const { url, anonKey } = getSupabasePublicConfig();
    const host = new URL(url).host;
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: 'no-store',
    });
    return {
      ok: res.ok,
      status: res.status,
      host,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      host: '',
      error: e instanceof Error ? e.message : 'probe failed',
    };
  }
}
