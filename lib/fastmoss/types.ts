export type DataSource = 'fastmoss-api' | 'crawl' | 'tiktok-oembed' | 'ai-estimate';

/** TikTok tools trên platform chỉ hỗ trợ Việt Nam. */
export type TikTokRegion = 'VN';

export type RankPeriod = '1d' | '7d' | '30d';

export type ProductRankItem = {
  rank: number;
  title: string;
  category?: string;
  price?: string;
  sales7d?: string;
  revenue7d?: string;
  growth?: string;
  shopName?: string;
  imageUrl?: string;
  productUrl?: string;
  /** Phần trăm hoa hồng affiliate TikTok Shop */
  commissionPercent?: string;
};

export type CreatorProfile = {
  handle: string;
  displayName?: string;
  followers?: string;
  avgViews?: string;
  engagementRate?: string;
  category?: string;
  region?: string;
  bio?: string;
  profileUrl?: string;
};

export type ShopProfile = {
  name: string;
  shopUrl?: string;
  region?: string;
  productCount?: string;
  totalSales?: string;
  rating?: string;
  topProducts?: ProductRankItem[];
};

export type LiveRankItem = {
  rank: number;
  title: string;
  creator?: string;
  viewers?: string;
  gmv?: string;
  duration?: string;
  category?: string;
};

export type VideoInsight = {
  title?: string;
  author?: string;
  views?: string;
  likes?: string;
  comments?: string;
  shares?: string;
  hashtags?: string[];
  hook?: string;
  summary?: string;
  videoUrl: string;
};

export type HashtagTrend = {
  hashtag: string;
  posts?: string;
  views?: string;
  growth?: string;
  category?: string;
};

export type MarketTrend = {
  category: string;
  trendScore?: string;
  growth?: string;
  topKeywords?: string[];
  insight?: string;
};

export type AdInsight = {
  title: string;
  advertiser?: string;
  impressions?: string;
  ctr?: string;
  landingUrl?: string;
};

export type AnalyticsResult<T> = {
  data: T;
  source: DataSource;
  fetchedAt: string;
  note?: string;
};
