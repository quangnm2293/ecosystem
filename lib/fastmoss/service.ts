import { freeLlmComplete, isFreeLlmConfigured } from '@/lib/ai/free-llm';
import { fetchProductPageData } from '@/lib/scraper/product-url';
import {
  apiAdSearch,
  apiCreatorLookup,
  apiHashtagTrends,
  apiLiveRank,
  apiMarketTrends,
  apiProductRank,
  apiShopLookup,
  apiVideoInsight,
  isFastMossApiConfigured,
} from '@/lib/fastmoss/client';
import {
  crawlCreatorFromHandle,
  crawlFastMossPage,
  crawlProductByUrl,
  crawlShopFromUrl,
  crawlVideoInsight,
  parseLlmJson,
} from '@/lib/fastmoss/crawl';
import {
  ensureStringArray,
  normalizeAdInsights,
  normalizeHashtagTrends,
  normalizeLiveRankList,
  normalizeMarketTrends,
  normalizeProductRankList,
} from '@/lib/fastmoss/normalize';
import type {
  AdInsight,
  AnalyticsResult,
  CreatorProfile,
  HashtagTrend,
  LiveRankItem,
  MarketTrend,
  ProductRankItem,
  RankPeriod,
  ShopProfile,
  TikTokRegion,
  VideoInsight,
} from '@/lib/fastmoss/types';

const REGION_LABELS: Record<TikTokRegion, string> = {
  VN: 'Việt Nam',
  US: 'United States',
  TH: 'Thailand',
  ID: 'Indonesia',
  MY: 'Malaysia',
  PH: 'Philippines',
  GB: 'United Kingdom',
  GLOBAL: 'Toàn cầu',
};

async function llmEstimateList<T>(
  system: string,
  user: string,
  normalize: (raw: unknown) => T[],
): Promise<AnalyticsResult<T[]>> {
  if (!isFreeLlmConfigured()) {
    throw new Error('Cần FASTMOSS API hoặc GROQ/GEMINI API để phân tích');
  }

  const raw = await freeLlmComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.4, maxTokens: 4096, jsonMode: true },
  );

  const items = normalize(parseLlmJson<unknown>(raw));

  return {
    data: items,
    source: 'ai-estimate',
    fetchedAt: new Date().toISOString(),
    note:
      items.length > 0
        ? 'Ước tính AI dựa trên xu hướng TikTok Shop — không phải dữ liệu FastMoss chính thức. Cấu hình FASTMOSS_CLIENT_ID để dùng API thật.'
        : 'AI không trả về danh sách hợp lệ — thử lại hoặc cấu hình FastMoss API.',
  };
}

async function llmEstimate<T>(
  system: string,
  user: string,
): Promise<AnalyticsResult<T>> {
  if (!isFreeLlmConfigured()) {
    throw new Error('Cần FASTMOSS API hoặc GROQ/GEMINI API để phân tích');
  }

  const raw = await freeLlmComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.4, maxTokens: 4096, jsonMode: true },
  );

  return {
    data: parseLlmJson<T>(raw),
    source: 'ai-estimate',
    fetchedAt: new Date().toISOString(),
    note: 'Ước tính AI dựa trên xu hướng TikTok Shop — không phải dữ liệu FastMoss chính thức. Cấu hình FASTMOSS_CLIENT_ID để dùng API thật.',
  };
}

async function tryApi<T>(fn: () => Promise<AnalyticsResult<T>>): Promise<AnalyticsResult<T> | null> {
  if (!isFastMossApiConfigured()) return null;
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function getProductRank(params: {
  region: TikTokRegion;
  category: string;
  period: RankPeriod;
  productUrl?: string;
}): Promise<AnalyticsResult<ProductRankItem[]>> {
  const api = await tryApi(() => apiProductRank(params));
  if (api) {
    const items = normalizeProductRankList(api.data);
    if (items.length) return { ...api, data: items };
  }

  if (params.productUrl) {
    const item = await crawlProductByUrl(params.productUrl);
    return {
      data: [
        {
          ...item,
          productUrl: item.productUrl ?? params.productUrl,
          commissionPercent: item.commissionPercent ?? '10%',
        },
      ],
      source: 'crawl',
      fetchedAt: new Date().toISOString(),
      note: 'Crawl trang sản phẩm — thêm FASTMOSS API để xem bảng xếp hạng đầy đủ.',
    };
  }

  return llmEstimateList(
    `Bạn là chuyên gia TikTok Shop analytics (kiểu FastMoss).
Trả ĐÚNG MỘT JSON array (không bọc trong object), 10 phần tử:
[{ "rank": number, "title": string, "category": string, "price": string, "sales7d": string, "revenue7d": string, "growth": string, "shopName": string, "commissionPercent": string, "productUrl": string }]`,
    `Top sản phẩm TikTok Shop — khu vực ${REGION_LABELS[params.region]}, danh mục "${params.category}", ${params.period}. Không bịa URL.`,
    normalizeProductRankList,
  );
}

export async function getMarketTrends(params: {
  region: TikTokRegion;
  category: string;
}): Promise<AnalyticsResult<MarketTrend[]>> {
  const api = await tryApi(() => apiMarketTrends(params));
  if (api) {
    const items = normalizeMarketTrends(api.data);
    if (items.length) return { ...api, data: items };
  }

  return llmEstimateList(
    `Trả ĐÚNG MỘT JSON array (không bọc object), 5 xu hướng TikTok Shop:
[{ "category": string, "trendScore": string, "growth": string, "topKeywords": string[], "insight": string }]`,
    `Xu hướng danh mục "${params.category}" tại ${REGION_LABELS[params.region]} — 5 xu hướng nổi bật.`,
    normalizeMarketTrends,
  );
}

export async function getCreatorProfile(handle: string): Promise<AnalyticsResult<CreatorProfile>> {
  const api = await tryApi(() => apiCreatorLookup(handle));
  if (api) return api;

  const crawled = await crawlCreatorFromHandle(handle);
  return {
    data: crawled,
    source: 'crawl',
    fetchedAt: new Date().toISOString(),
    note: 'Profile công khai hạn chế. Dùng FastMoss API cho follower/GMV chính xác.',
  };
}

export async function getShopAnalytics(query: string): Promise<AnalyticsResult<ShopProfile>> {
  if (query.startsWith('http')) {
    const api = await tryApi(() => apiShopLookup(query));
    if (api) return api;
    const crawled = await crawlShopFromUrl(query);
    return { data: crawled, source: 'crawl', fetchedAt: new Date().toISOString() };
  }

  const api = await tryApi(() => apiShopLookup(query));
  if (api) return api;

  return llmEstimate<ShopProfile>(
    `Trả JSON object shop TikTok: { "name", "region", "productCount", "totalSales", "rating", "topProducts": [{ "rank", "title", "price", "sales7d" }] }`,
    `Phân tích cửa hàng TikTok Shop: "${query}"`,
  );
}

export async function getLiveRank(params: {
  region: TikTokRegion;
  period: RankPeriod;
}): Promise<AnalyticsResult<LiveRankItem[]>> {
  const api = await tryApi(() => apiLiveRank(params));
  if (api) {
    const items = normalizeLiveRankList(api.data);
    if (items.length) return { ...api, data: items };
  }

  return llmEstimateList(
    `Trả ĐÚNG MỘT JSON array top livestream: [{ "rank", "title", "creator", "viewers", "gmv", "duration", "category" }]`,
    `BXH livestream ${REGION_LABELS[params.region]} — ${params.period}, top 10.`,
    normalizeLiveRankList,
  );
}

export async function getVideoAnalytics(videoUrl: string): Promise<AnalyticsResult<VideoInsight>> {
  const api = await tryApi(() => apiVideoInsight(videoUrl));
  if (api) return api;

  const oembed = await crawlVideoInsight(videoUrl);
  if (oembed.title) {
    return {
      data: oembed,
      source: 'tiktok-oembed',
      fetchedAt: new Date().toISOString(),
      note: 'Dữ liệu oEmbed TikTok. FastMoss API cho views/GMV chi tiết.',
    };
  }

  return llmEstimate<VideoInsight>(
    `JSON: { "title", "author", "views", "likes", "comments", "hashtags": string[], "hook", "summary", "videoUrl" }`,
    `Phân tích video TikTok: ${videoUrl}`,
  );
}

export async function getHashtagTrends(params: {
  region: TikTokRegion;
  keyword?: string;
}): Promise<AnalyticsResult<HashtagTrend[]>> {
  const api = await tryApi(() => apiHashtagTrends(params));
  if (api) {
    const items = normalizeHashtagTrends(api.data);
    if (items.length) return { ...api, data: items };
  }

  return llmEstimateList(
    `Trả ĐÚNG MỘT JSON array hashtag: [{ "hashtag", "posts", "views", "growth", "category" }]`,
    `Hashtag TikTok trending ${REGION_LABELS[params.region]}${params.keyword ? ` liên quan "${params.keyword}"` : ''} — top 15.`,
    normalizeHashtagTrends,
  );
}

export async function getAdInsights(params: {
  keyword: string;
  region: TikTokRegion;
}): Promise<AnalyticsResult<AdInsight[]>> {
  const api = await tryApi(() => apiAdSearch(params));
  if (api) {
    const items = normalizeAdInsights(api.data);
    if (items.length) return { ...api, data: items };
  }

  return llmEstimateList(
    `Trả ĐÚNG MỘT JSON array quảng cáo: [{ "title", "advertiser", "impressions", "ctr", "landingUrl" }]`,
    `Quảng cáo TikTok Shop keyword "${params.keyword}" tại ${REGION_LABELS[params.region]} — 8 mẫu.`,
    normalizeAdInsights,
  );
}

export async function getVocAnalysis(productUrl: string): Promise<AnalyticsResult<{ summary: string; painPoints: string[]; praises: string[] }>> {
  const page = await fetchProductPageData(productUrl);
  const fastmossSnippet = productUrl.includes('fastmoss.com')
    ? await crawlFastMossPage(productUrl)
    : null;

  const voc = await llmEstimate<{ summary: string; painPoints: unknown; praises: unknown }>(
    `Phân tích VOC TikTok Shop. JSON object: { "summary": string, "painPoints": string[], "praises": string[] }`,
    `Sản phẩm: ${page.title}\nMô tả: ${page.description}\nSnippet: ${page.textSnippet.slice(0, 2000)}${fastmossSnippet ? `\nFastMoss HTML: ${fastmossSnippet.slice(0, 3000)}` : ''}`,
  );

  return {
    ...voc,
    data: {
      summary: voc.data.summary ?? '',
      painPoints: ensureStringArray(voc.data.painPoints),
      praises: ensureStringArray(voc.data.praises),
    },
  };
}

export { REGION_LABELS };
