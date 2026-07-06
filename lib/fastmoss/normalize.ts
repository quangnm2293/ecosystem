import type {
  AdInsight,
  HashtagTrend,
  LiveRankItem,
  MarketTrend,
  ProductRankItem,
} from '@/lib/fastmoss/types';

const ARRAY_KEYS = ['data', 'items', 'list', 'results', 'products', 'records', 'rows'] as const;

export function extractArray(raw: unknown, extraKeys: string[] = []): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;
  for (const key of [...extraKeys, ...ARRAY_KEYS]) {
    const val = obj[key];
    if (Array.isArray(val)) return val;
  }

  return [];
}

export function normalizeProductRankList(raw: unknown): ProductRankItem[] {
  const arr = extractArray(raw, ['productRank', 'topProducts', 'ranking']);
  return arr.slice(0, 50).map((item, i) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      rank: Number(o.rank ?? o.ranking ?? i + 1),
      title: String(o.title ?? o.productTitle ?? o.product_name ?? o.name ?? 'N/A'),
      category: o.category != null ? String(o.category) : undefined,
      price: o.price != null ? String(o.price) : undefined,
      sales7d:
        o.sales7d != null
          ? String(o.sales7d)
          : o.sales_7d != null
            ? String(o.sales_7d)
            : o.sales != null
              ? String(o.sales)
              : undefined,
      revenue7d:
        o.revenue7d != null
          ? String(o.revenue7d)
          : o.revenue_7d != null
            ? String(o.revenue_7d)
            : o.revenue != null
              ? String(o.revenue)
              : undefined,
      growth: o.growth != null ? String(o.growth) : undefined,
      shopName:
        o.shopName != null
          ? String(o.shopName)
          : o.shop_name != null
            ? String(o.shop_name)
            : undefined,
      imageUrl: o.imageUrl != null ? String(o.imageUrl) : o.image_url != null ? String(o.image_url) : undefined,
      productUrl:
        o.productUrl != null
          ? String(o.productUrl)
          : o.product_url != null
            ? String(o.product_url)
            : o.url != null
              ? String(o.url)
              : o.link != null
                ? String(o.link)
                : undefined,
      commissionPercent:
        o.commissionPercent != null
          ? String(o.commissionPercent)
          : o.commission_percent != null
            ? String(o.commission_percent)
            : o.commission != null
              ? String(o.commission)
              : o.affiliateCommission != null
                ? String(o.affiliateCommission)
                : undefined,
    };
  });
}

export function normalizeMarketTrends(raw: unknown): MarketTrend[] {
  return extractArray(raw, ['trends', 'marketTrends']).map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      category: String(o.category ?? o.name ?? 'N/A'),
      trendScore: o.trendScore != null ? String(o.trendScore) : o.score != null ? String(o.score) : undefined,
      growth: o.growth != null ? String(o.growth) : undefined,
      topKeywords: Array.isArray(o.topKeywords)
        ? o.topKeywords.map(String)
        : Array.isArray(o.keywords)
          ? o.keywords.map(String)
          : undefined,
      insight: o.insight != null ? String(o.insight) : o.summary != null ? String(o.summary) : undefined,
    };
  });
}

export function normalizeLiveRankList(raw: unknown): LiveRankItem[] {
  return extractArray(raw, ['lives', 'livestreams', 'ranking']).map((item, i) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      rank: Number(o.rank ?? i + 1),
      title: String(o.title ?? o.name ?? 'Live'),
      creator: o.creator != null ? String(o.creator) : o.host != null ? String(o.host) : undefined,
      viewers: o.viewers != null ? String(o.viewers) : undefined,
      gmv: o.gmv != null ? String(o.gmv) : undefined,
      duration: o.duration != null ? String(o.duration) : undefined,
      category: o.category != null ? String(o.category) : undefined,
    };
  });
}

export function normalizeHashtagTrends(raw: unknown): HashtagTrend[] {
  return extractArray(raw, ['hashtags', 'tags']).map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const tag = String(o.hashtag ?? o.tag ?? o.name ?? '#trending');
    return {
      hashtag: tag.startsWith('#') ? tag : `#${tag}`,
      posts: o.posts != null ? String(o.posts) : undefined,
      views: o.views != null ? String(o.views) : undefined,
      growth: o.growth != null ? String(o.growth) : undefined,
      category: o.category != null ? String(o.category) : undefined,
    };
  });
}

export function normalizeAdInsights(raw: unknown): AdInsight[] {
  return extractArray(raw, ['ads', 'advertisements']).map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      title: String(o.title ?? o.name ?? 'Ad'),
      advertiser: o.advertiser != null ? String(o.advertiser) : undefined,
      impressions: o.impressions != null ? String(o.impressions) : undefined,
      ctr: o.ctr != null ? String(o.ctr) : undefined,
      landingUrl: o.landingUrl != null ? String(o.landingUrl) : o.url != null ? String(o.url) : undefined,
    };
  });
}

export function ensureStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return [val];
  return [];
}
