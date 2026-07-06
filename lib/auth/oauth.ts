import type { NextRequest } from 'next/server';
import { SITE_URL } from '@/lib/config/site';

/** Origin dùng cho OAuth redirect — ưu tiên NEXT_PUBLIC_SITE_URL trên production. */
export function resolveAuthOrigin(request: Request | NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured && !configured.includes('localhost')) {
    return configured;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const { origin } = new URL(request.url);
  if (origin && origin !== 'null') return origin;

  return SITE_URL.replace(/\/$/, '');
}

export function buildAuthCallbackUrl(origin: string, next = '/'): string {
  const safeNext = next.startsWith('/') ? next : '/';
  return `${origin.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export const SUPABASE_AUTH_CHECKLIST = [
  'Supabase → Authentication → URL Configuration → Site URL = URL production',
  'Redirect URLs: https://YOUR-DOMAIN/auth/callback và http://localhost:3000/auth/callback',
  'Preview Vercel: thêm https://*.vercel.app/auth/callback',
  'Authentication → Providers → Google: bật + Client ID/Secret',
  'Google Cloud Console → Authorized redirect URI: https://YOUR-PROJECT.supabase.co/auth/v1/callback',
  'Vercel env: NEXT_PUBLIC_SITE_URL = https://YOUR-DOMAIN (không slash cuối)',
];
