import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildAuthCallbackUrl, resolveAuthOrigin } from '@/lib/auth/oauth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const origin = resolveAuthOrigin(request);
  let next = searchParams.get('next') ?? '/';

  if (!next.startsWith('/')) {
    next = '/';
  }

  const fail = (reason?: string) => {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'auth');
    if (reason) url.searchParams.set('reason', reason.slice(0, 200));
    return NextResponse.redirect(url);
  };

  if (!code) {
    return fail('missing_code');
  }

  const successUrl = `${origin}${next}`;
  const response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback]', error.message);
    return fail(error.message);
  }

  return response;
}

// Re-export for tests / docs
export { buildAuthCallbackUrl };
