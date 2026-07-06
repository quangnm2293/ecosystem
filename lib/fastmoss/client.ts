import type { AnalyticsResult, ProductRankItem, CreatorProfile, ShopProfile, LiveRankItem, VideoInsight, HashtagTrend, MarketTrend, AdInsight, RankPeriod, TikTokRegion } from '@/lib/fastmoss/types';
import { normalizeProductRankList } from '@/lib/fastmoss/normalize';

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function getBaseUrl(): string {
  return process.env.FASTMOSS_API_BASE ?? 'https://openapi.fastmoss.com';
}

export function isFastMossApiConfigured(): boolean {
  return Boolean(process.env.FASTMOSS_CLIENT_ID && process.env.FASTMOSS_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const clientId = process.env.FASTMOSS_CLIENT_ID;
  const clientSecret = process.env.FASTMOSS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('FASTMOSS_CLIENT_ID / FASTMOSS_CLIENT_SECRET chưa cấu hình');
  }

  const tokenPath = process.env.FASTMOSS_TOKEN_PATH ?? '/oauth/token';
  const res = await fetch(`${getBaseUrl()}${tokenPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FastMoss auth failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) throw new Error('FastMoss không trả access_token');
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function apiGet<T>(paths: string[], query?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  let lastError = 'unknown';

  for (const path of paths) {
    const res = await fetch(`${getBaseUrl()}${path}${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) return (await res.json()) as T;
    lastError = await res.text();
    if (res.status !== 404) break;
  }

  throw new Error(`FastMoss API: ${lastError.slice(0, 300)}`);
}

function wrap<T>(data: T, note?: string): AnalyticsResult<T> {
  return { data, source: 'fastmoss-api', fetchedAt: new Date().toISOString(), note };
}

function normalizeProductList(raw: unknown): ProductRankItem[] {
  return normalizeProductRankList(raw);
}

export async function apiProductRank(params: {
  region: TikTokRegion;
  category: string;
  period: RankPeriod;
}): Promise<AnalyticsResult<ProductRankItem[]>> {
  const raw = await apiGet<unknown>(
    ['/v1/products/rank', '/api/v1/product/rank', '/v1/product/rank'],
    { region: params.region, category: params.category, period: params.period },
  );
  return wrap(normalizeProductList(raw));
}

export async function apiMarketTrends(params: {
  region: TikTokRegion;
  category: string;
}): Promise<AnalyticsResult<MarketTrend[]>> {
  const raw = await apiGet<unknown>(
    ['/v1/market/trends', '/api/v1/market/trends'],
    { region: params.region, category: params.category },
  );
  const arr = Array.isArray(raw) ? raw : (raw as { data?: MarketTrend[] }).data ?? [];
  return wrap(arr as MarketTrend[]);
}

export async function apiCreatorLookup(handle: string): Promise<AnalyticsResult<CreatorProfile>> {
  const raw = await apiGet<CreatorProfile | { data: CreatorProfile }>(
    ['/v1/creators/profile', '/api/v1/creator/detail'],
    { handle: handle.replace(/^@/, '') },
  );
  const data = (raw as { data?: CreatorProfile }).data ?? (raw as CreatorProfile);
  return wrap({ ...data, handle: data.handle ?? handle });
}

export async function apiShopLookup(query: string): Promise<AnalyticsResult<ShopProfile>> {
  const raw = await apiGet<ShopProfile | { data: ShopProfile }>(
    ['/v1/shops/detail', '/api/v1/shop/detail'],
    { q: query },
  );
  const data = (raw as { data?: ShopProfile }).data ?? (raw as ShopProfile);
  return wrap(data);
}

export async function apiLiveRank(params: {
  region: TikTokRegion;
  period: RankPeriod;
}): Promise<AnalyticsResult<LiveRankItem[]>> {
  const raw = await apiGet<unknown>(
    ['/v1/live/rank', '/api/v1/live/rank'],
    { region: params.region, period: params.period },
  );
  const arr = Array.isArray(raw) ? raw : (raw as { data?: LiveRankItem[] }).data ?? [];
  return wrap(arr as LiveRankItem[]);
}

export async function apiVideoInsight(videoUrl: string): Promise<AnalyticsResult<VideoInsight>> {
  const raw = await apiGet<VideoInsight | { data: VideoInsight }>(
    ['/v1/videos/detail', '/api/v1/video/detail'],
    { url: videoUrl },
  );
  const data = (raw as { data?: VideoInsight }).data ?? (raw as VideoInsight);
  return wrap({ ...data, videoUrl });
}

export async function apiHashtagTrends(params: {
  region: TikTokRegion;
  keyword?: string;
}): Promise<AnalyticsResult<HashtagTrend[]>> {
  const raw = await apiGet<unknown>(
    ['/v1/hashtags/trend', '/api/v1/hashtag/trend'],
    { region: params.region, keyword: params.keyword ?? '' },
  );
  const arr = Array.isArray(raw) ? raw : (raw as { data?: HashtagTrend[] }).data ?? [];
  return wrap(arr as HashtagTrend[]);
}

export async function apiAdSearch(params: {
  keyword: string;
  region: TikTokRegion;
}): Promise<AnalyticsResult<AdInsight[]>> {
  const raw = await apiGet<unknown>(
    ['/v1/ads/search', '/api/v1/ad/search'],
    { keyword: params.keyword, region: params.region },
  );
  const arr = Array.isArray(raw) ? raw : (raw as { data?: AdInsight[] }).data ?? [];
  return wrap(arr as AdInsight[]);
}
