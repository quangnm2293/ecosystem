import type { AiToolDefinition, InputField } from '@/modules/ai-tools/types';
import {
  executeAdInsights,
  executeCreatorLookup,
  executeHashtagTrends,
  executeLiveRank,
  executeMarketTrends,
  executeProductRank,
  executeShopAnalytics,
  executeVideoAnalytics,
  executeVocAnalysis,
} from '@/modules/tiktok-analytics/executors';

const REGION_FIELD: InputField = {
  name: 'region',
  label: 'Khu vực',
  type: 'select',
  options: [
    { label: 'Việt Nam', value: 'VN' },
    { label: 'United States', value: 'US' },
    { label: 'Thailand', value: 'TH' },
    { label: 'Indonesia', value: 'ID' },
    { label: 'Malaysia', value: 'MY' },
    { label: 'Philippines', value: 'PH' },
    { label: 'Toàn cầu', value: 'GLOBAL' },
  ],
  defaultValue: 'VN',
};

const PERIOD_FIELD: InputField = {
  name: 'period',
  label: 'Khoảng thời gian',
  type: 'select',
  options: [
    { label: '24 giờ', value: '1d' },
    { label: '7 ngày', value: '7d' },
    { label: '30 ngày', value: '30d' },
  ],
  defaultValue: '7d',
};

const CATEGORY_FIELD: InputField = {
  name: 'category',
  label: 'Danh mục',
  type: 'select',
  options: [
    { label: 'Làm đẹp & Chăm sóc cá nhân', value: 'beauty' },
    { label: 'Thời trang', value: 'fashion' },
    { label: 'Điện tử', value: 'electronics' },
    { label: 'Nhà cửa & Đời sống', value: 'home' },
    { label: 'Thực phẩm', value: 'food' },
    { label: 'Mẹ & Bé', value: 'mother-baby' },
    { label: 'Thể thao', value: 'sports' },
  ],
  defaultValue: 'beauty',
};

const FASTMOSS_SEO = {
  howToUse: [
    'Chọn khu vực và bộ lọc phù hợp.',
    'Nhấn Phân tích — ưu tiên FastMoss API nếu đã cấu hình .env.',
    'Không có API → crawl / AI ước tính (Groq/Gemini).',
  ],
  examples: [],
  faq: [
    {
      q: 'Dữ liệu lấy từ đâu?',
      a: 'Ưu tiên FastMoss OpenAPI (developers.fastmoss.com). Fallback: crawl TikTok oEmbed, trang sản phẩm, hoặc AI ước tính.',
    },
    {
      q: 'Cần API key FastMoss?',
      a: 'Không bắt buộc — có GROQ/GEMINI vẫn chạy được. API FastMoss cho dữ liệu chính xác như fastmoss.com.',
    },
  ],
};

export const tiktokProductRankTool: AiToolDefinition = {
  toolKey: 'tiktok-product-rank',
  slug: 'tiktok-product-rank',
  name: 'Sản phẩm bán chạy TikTok Shop',
  description: 'BXH sản phẩm hot — giống Khai Thác Sản Phẩm Bán Chạy trên FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [
    REGION_FIELD,
    CATEGORY_FIELD,
    PERIOD_FIELD,
    {
      name: 'productUrl',
      label: 'Link sản phẩm (tùy chọn — crawl 1 SP)',
      type: 'text',
      placeholder: 'https://... hoặc để trống xem BXH',
      required: false,
    },
  ],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-market-trends', 'url-to-video'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeProductRank,
};

export const tiktokMarketTrendsTool: AiToolDefinition = {
  toolKey: 'tiktok-market-trends',
  slug: 'tiktok-market-trends',
  name: 'Xu hướng thị trường TikTok',
  description: 'Phân tích xu hướng danh mục — tương tự Xu Hướng Thị Trường FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [REGION_FIELD, CATEGORY_FIELD],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-product-rank', 'tiktok-hashtag-trends'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeMarketTrends,
};

export const tiktokCreatorLookupTool: AiToolDefinition = {
  toolKey: 'tiktok-creator-lookup',
  slug: 'tiktok-creator-lookup',
  name: 'Tra cứu KOL / Creator',
  description: 'Thông tin creator TikTok — Tiếp Thị KOL trên FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [
    {
      name: 'handle',
      label: 'TikTok @handle',
      type: 'text',
      placeholder: '@username',
      required: true,
    },
  ],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-video-analytics', 'tiktok-script'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeCreatorLookup,
};

export const tiktokShopAnalyticsTool: AiToolDefinition = {
  toolKey: 'tiktok-shop-analytics',
  slug: 'tiktok-shop-analytics',
  name: 'Phân tích cửa hàng TikTok Shop',
  description: 'Doanh số, sản phẩm top — Thông Tin Chi Tiết Cửa Hàng FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [
    {
      name: 'shopQuery',
      label: 'Tên shop hoặc URL',
      type: 'text',
      placeholder: 'Tên cửa hàng hoặc link TikTok Shop',
      required: true,
    },
  ],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-product-rank'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeShopAnalytics,
};

export const tiktokLiveRankTool: AiToolDefinition = {
  toolKey: 'tiktok-live-rank',
  slug: 'tiktok-live-rank',
  name: 'BXH Livestream TikTok Shop',
  description: 'Top phiên live GMV cao — Vận Hành Livestream FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [REGION_FIELD, PERIOD_FIELD],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-creator-lookup'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeLiveRank,
};

export const tiktokVideoAnalyticsTool: AiToolDefinition = {
  toolKey: 'tiktok-video-analytics',
  slug: 'tiktok-video-analytics',
  name: 'Phân tích video TikTok',
  description: 'Metrics & hook video — Nắm Bắt Nội Dung Video + Giám sát Video FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [
    {
      name: 'videoUrl',
      label: 'Link video TikTok',
      type: 'text',
      placeholder: 'https://www.tiktok.com/@user/video/...',
      required: true,
    },
  ],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-script', 'url-to-video'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeVideoAnalytics,
};

export const tiktokHashtagTrendsTool: AiToolDefinition = {
  toolKey: 'tiktok-hashtag-trends',
  slug: 'tiktok-hashtag-trends',
  name: 'Hashtag trending TikTok',
  description: 'Hashtag đang lên — hỗ trợ chọn sản phẩm & content.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [
    REGION_FIELD,
    {
      name: 'keyword',
      label: 'Từ khóa (tùy chọn)',
      type: 'text',
      placeholder: 'VD: serum, unboxing',
      required: false,
    },
  ],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-market-trends'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeHashtagTrends,
};

export const tiktokAdInsightsTool: AiToolDefinition = {
  toolKey: 'tiktok-ad-insights',
  slug: 'tiktok-ad-insights',
  name: 'Quảng cáo TikTok Shop',
  description: 'Tìm creative ads hiệu quả — Quảng Cáo & Hiển Thị FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [
    REGION_FIELD,
    {
      name: 'keyword',
      label: 'Từ khóa sản phẩm / niche',
      type: 'text',
      placeholder: 'VD: tai nghe bluetooth',
      required: true,
    },
  ],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-product-rank'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeAdInsights,
};

export const tiktokVocTool: AiToolDefinition = {
  toolKey: 'tiktok-voc',
  slug: 'tiktok-voc-analysis',
  name: 'VOC — Thấu hiểu người tiêu dùng',
  description: 'Phân tích review & cảm xúc khách hàng — AI VOC FastMoss.',
  category: 'tiktok-shop',
  categoryLabel: 'TikTok Shop Analytics',
  implemented: true,
  inputFields: [
    {
      name: 'productUrl',
      label: 'Link sản phẩm',
      type: 'text',
      placeholder: 'TikTok Shop / Shopee / FastMoss product URL',
      required: true,
    },
  ],
  outputFormat: 'markdown',
  seo: FASTMOSS_SEO,
  relatedToolKeys: ['tiktok-product-rank', 'product-description'],
  systemPrompt: '',
  buildUserPrompt: () => '',
  customExecute: executeVocAnalysis,
};

export const TIKTOK_ANALYTICS_TOOLS = [
  tiktokProductRankTool,
  tiktokMarketTrendsTool,
  tiktokCreatorLookupTool,
  tiktokShopAnalyticsTool,
  tiktokLiveRankTool,
  tiktokVideoAnalyticsTool,
  tiktokHashtagTrendsTool,
  tiktokAdInsightsTool,
  tiktokVocTool,
] as const;

export const TIKTOK_ANALYTICS_MAP = Object.fromEntries(
  TIKTOK_ANALYTICS_TOOLS.map((t) => [t.toolKey, t]),
) as Record<string, AiToolDefinition>;

/** Mapping FastMoss feature → tool slug */
export const FASTMOSS_FEATURE_MAP = [
  { fastmoss: 'Xu Hướng Thị Trường', slug: 'tiktok-market-trends' },
  { fastmoss: 'Khai Thác Sản Phẩm Bán Chạy', slug: 'tiktok-product-rank' },
  { fastmoss: 'Tiếp Thị KOL', slug: 'tiktok-creator-lookup' },
  { fastmoss: 'Thông Tin Cửa Hàng', slug: 'tiktok-shop-analytics' },
  { fastmoss: 'Vận Hành Livestream', slug: 'tiktok-live-rank' },
  { fastmoss: 'Nắm Bắt Video / Giám sát Video', slug: 'tiktok-video-analytics' },
  { fastmoss: 'Quảng Cáo & Hiển Thị', slug: 'tiktok-ad-insights' },
  { fastmoss: 'VOC AI', slug: 'tiktok-voc-analysis' },
  { fastmoss: 'Kịch bản + Prompt Veo 3', slug: 'ai-tiktok-script-generator' },
  { fastmoss: 'URL to Video', slug: 'ai-url-to-video' },
] as const;
