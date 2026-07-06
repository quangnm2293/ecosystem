import { NextResponse } from 'next/server';
import { probeSupabaseAuthHealth, sanitizeEnvValue } from '@/lib/supabase/env';

/** Kiểm tra cấu hình Supabase trên server (Vercel debug). Không lộ full API key. */
export async function GET() {
  const url = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const hasUrl = Boolean(url);
  const hasAnon = Boolean(anon);
  const hasService = Boolean(service);
  const anonLooksJwt = anon.startsWith('eyJ') || anon.startsWith('sb_publishable_');

  let authHealth = null as Awaited<ReturnType<typeof probeSupabaseAuthHealth>> | null;
  if (hasUrl && hasAnon && anonLooksJwt) {
    authHealth = await probeSupabaseAuthHealth();
  }

  const ok = Boolean(authHealth?.ok);

  return NextResponse.json({
    ok,
    supabase: {
      hasUrl,
      hasAnon,
      hasService,
      anonLooksJwt,
      host: url ? new URL(url).host : null,
      anonKeyLength: anon.length || 0,
      authHealth,
    },
    hints: ok
      ? []
      : [
          'Vercel → Settings → Environment Variables → Production',
          'Copy NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY từ Supabase Dashboard → Settings → API',
          'Dùng key "anon" / "public" (KHÔNG dùng service_role cho NEXT_PUBLIC_*)',
          'Không bọc giá trị trong dấu ngoặc kép',
          'Sau khi sửa env → Redeploy (Deployments → ⋯ → Redeploy)',
        ],
  });
}
