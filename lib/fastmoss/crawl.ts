import { fetchProductPageData } from '@/lib/scraper/product-url';
import type { CreatorProfile, ProductRankItem, ShopProfile, VideoInsight } from '@/lib/fastmoss/types';

export async function fetchTikTokOembed(videoUrl: string): Promise<{
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
} | null> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
  } catch {
    return null;
  }
}

export async function crawlVideoInsight(videoUrl: string): Promise<VideoInsight> {
  const oembed = await fetchTikTokOembed(videoUrl);
  return {
    videoUrl,
    title: oembed?.title,
    author: oembed?.author_name,
    summary: oembed?.title ? `Video: ${oembed.title}` : undefined,
    hashtags: extractHashtags(oembed?.title ?? ''),
  };
}

export async function crawlShopFromUrl(shopUrl: string): Promise<ShopProfile> {
  const page = await fetchProductPageData(shopUrl);
  return {
    name: page.title ?? 'TikTok Shop',
    shopUrl,
    region: guessRegion(shopUrl),
    topProducts: page.title
      ? [
          {
            rank: 1,
            title: page.title,
            price: page.price ?? undefined,
            productUrl: shopUrl,
            imageUrl: page.imageUrl ?? undefined,
          },
        ]
      : [],
  };
}

export async function crawlCreatorFromHandle(handle: string): Promise<CreatorProfile> {
  const clean = handle.replace(/^@/, '').trim();
  return {
    handle: clean,
    displayName: clean,
    profileUrl: `https://www.tiktok.com/@${clean}`,
    region: 'GLOBAL',
    bio: 'Dữ liệu công khai hạn chế — dùng FastMoss API để có metrics đầy đủ.',
  };
}

function extractHashtags(text: string): string[] {
  return [...text.matchAll(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/gi)].map((m) => m[0]);
}

function guessRegion(url: string): string {
  if (/\.vn|shopee\.vn|tiktok\.com\/vi/i.test(url)) return 'VN';
  if (/\.th|shopee\.co\.th/i.test(url)) return 'TH';
  if (/\.id|tokopedia|shopee\.co\.id/i.test(url)) return 'ID';
  if (/\.com\.my|shopee\.com\.my/i.test(url)) return 'MY';
  return 'GLOBAL';
}

export function buildProductRankFromPage(
  page: Awaited<ReturnType<typeof fetchProductPageData>>,
  rank = 1,
): ProductRankItem {
  return {
    rank,
    title: page.title ?? 'Sản phẩm',
    price: page.price ?? undefined,
    productUrl: page.url,
    imageUrl: page.imageUrl ?? undefined,
    shopName: new URL(page.url).hostname,
  };
}

export async function crawlProductByUrl(productUrl: string): Promise<ProductRankItem> {
  const page = await fetchProductPageData(productUrl);
  return buildProductRankFromPage(page);
}

export async function crawlFastMossPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcosystemBot/1.0)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextMatch) return nextMatch[1].slice(0, 50_000);
    return html.slice(0, 30_000);
  } catch {
    return null;
  }
}

export function parseLlmJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as T;
}
