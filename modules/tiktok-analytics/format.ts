import type {
  AdInsight,
  AnalyticsResult,
  CreatorProfile,
  HashtagTrend,
  LiveRankItem,
  MarketTrend,
  ProductRankItem,
  ShopProfile,
  VideoInsight,
} from '@/lib/fastmoss/types';
import {
  normalizeAdInsights,
  normalizeHashtagTrends,
  normalizeLiveRankList,
  normalizeMarketTrends,
  normalizeProductRankList,
  ensureStringArray,
} from '@/lib/fastmoss/normalize';

const SOURCE_LABELS: Record<string, string> = {
  'fastmoss-api': 'FastMoss OpenAPI',
  crawl: 'Crawl trang web',
  'tiktok-oembed': 'TikTok oEmbed',
  'ai-estimate': 'AI ước tính (Groq/Gemini)',
};

function header(result: AnalyticsResult<unknown>, title: string): string {
  const src = SOURCE_LABELS[result.source] ?? result.source;
  let md = `## ${title}\n\n`;
  md += `- **Nguồn:** ${src}\n`;
  md += `- **Cập nhật:** ${new Date(result.fetchedAt).toLocaleString('vi-VN')}\n`;
  if (result.note) md += `\n> ${result.note}\n`;
  return md;
}

export function formatProductRank(result: AnalyticsResult<ProductRankItem[] | unknown>): string {
  const items = normalizeProductRankList(result.data);
  let md = header(result, 'Sản phẩm bán chạy — TikTok Shop');
  if (!items.length) {
    md += '\n_Không có dữ liệu sản phẩm — thử lại hoặc cấu hình FastMoss API._\n';
    return md;
  }
  md += '\n| # | Sản phẩm | Giá | Doanh thu 7d | Tăng trưởng | Hoa hồng | Shop | Link |\n';
  md += '|---|----------|-----|--------------|-------------|----------|------|------|\n';
  for (const p of items) {
    md += `| ${p.rank} | ${p.title} | ${p.price ?? '—'} | ${p.revenue7d ?? p.sales7d ?? '—'} | ${p.growth ?? '—'} | ${p.commissionPercent ? (p.commissionPercent.endsWith('%') ? p.commissionPercent : `${p.commissionPercent}%`) : '—'} | ${p.shopName ?? '—'} | ${p.productUrl ?? '—'} |\n`;
  }
  return md;
}

export function formatMarketTrends(result: AnalyticsResult<MarketTrend[] | unknown>): string {
  const trends = normalizeMarketTrends(result.data);
  let md = header(result, 'Xu hướng thị trường');
  for (const t of trends) {
    md += `\n### ${t.category}\n`;
    md += `- **Điểm xu hướng:** ${t.trendScore ?? '—'}\n`;
    md += `- **Tăng trưởng:** ${t.growth ?? '—'}\n`;
    if (t.topKeywords?.length) md += `- **Từ khóa:** ${t.topKeywords.join(', ')}\n`;
    if (t.insight) md += `\n${t.insight}\n`;
  }
  return md;
}

export function formatCreator(result: AnalyticsResult<CreatorProfile>): string {
  const c = result.data;
  let md = header(result, `KOL / Creator — @${c.handle}`);
  md += `\n| Chỉ số | Giá trị |\n|--------|--------|\n`;
  md += `| Tên | ${c.displayName ?? c.handle} |\n`;
  md += `| Followers | ${c.followers ?? '—'} |\n`;
  md += `| Avg views | ${c.avgViews ?? '—'} |\n`;
  md += `| Engagement | ${c.engagementRate ?? '—'} |\n`;
  md += `| Danh mục | ${c.category ?? '—'} |\n`;
  md += `| Khu vực | ${c.region ?? '—'} |\n`;
  if (c.profileUrl) md += `\n[Profile TikTok](${c.profileUrl})\n`;
  if (c.bio) md += `\n> ${c.bio}\n`;
  return md;
}

export function formatShop(result: AnalyticsResult<ShopProfile>): string {
  const s = result.data;
  let md = header(result, `Cửa hàng — ${s.name}`);
  md += `\n| Chỉ số | Giá trị |\n|--------|--------|\n`;
  md += `| Sản phẩm | ${s.productCount ?? '—'} |\n`;
  md += `| Doanh số | ${s.totalSales ?? '—'} |\n`;
  md += `| Đánh giá | ${s.rating ?? '—'} |\n`;
  if (s.shopUrl) md += `\n[Link shop](${s.shopUrl})\n`;
  if (s.topProducts?.length) {
    md += '\n### Top sản phẩm\n\n| # | Sản phẩm | Giá |\n|---|----------|-----|\n';
    for (const p of s.topProducts) {
      md += `| ${p.rank} | ${p.title} | ${p.price ?? '—'} |\n`;
    }
  }
  return md;
}

export function formatLiveRank(result: AnalyticsResult<LiveRankItem[] | unknown>): string {
  const lives = normalizeLiveRankList(result.data);
  let md = header(result, 'BXH Livestream TikTok Shop');
  md += '\n| # | Phiên live | Creator | Viewers | GMV | Thời lượng |\n';
  md += '|---|------------|---------|---------|-----|------------|\n';
  for (const l of lives) {
    md += `| ${l.rank} | ${l.title} | ${l.creator ?? '—'} | ${l.viewers ?? '—'} | ${l.gmv ?? '—'} | ${l.duration ?? '—'} |\n`;
  }
  return md;
}

export function formatVideo(result: AnalyticsResult<VideoInsight>): string {
  const v = result.data;
  let md = header(result, 'Phân tích video TikTok');
  md += `\n| Chỉ số | Giá trị |\n|--------|--------|\n`;
  md += `| Tiêu đề | ${v.title ?? '—'} |\n`;
  md += `| Creator | ${v.author ?? '—'} |\n`;
  md += `| Views | ${v.views ?? '—'} |\n`;
  md += `| Likes | ${v.likes ?? '—'} |\n`;
  md += `| Comments | ${v.comments ?? '—'} |\n`;
  if (v.hashtags?.length) md += `\n**Hashtags:** ${v.hashtags.join(' ')}\n`;
  if (v.hook) md += `\n**Hook:** ${v.hook}\n`;
  if (v.summary) md += `\n**Tóm tắt:** ${v.summary}\n`;
  md += `\n[Video](${v.videoUrl})\n`;
  return md;
}

export function formatHashtags(result: AnalyticsResult<HashtagTrend[] | unknown>): string {
  const tags = normalizeHashtagTrends(result.data);
  let md = header(result, 'Hashtag trending');
  md += '\n| Hashtag | Bài đăng | Views | Tăng trưởng | Danh mục |\n';
  md += '|---------|----------|-------|-------------|----------|\n';
  for (const h of tags) {
    md += `| ${h.hashtag} | ${h.posts ?? '—'} | ${h.views ?? '—'} | ${h.growth ?? '—'} | ${h.category ?? '—'} |\n`;
  }
  return md;
}

export function formatAds(result: AnalyticsResult<AdInsight[] | unknown>): string {
  const ads = normalizeAdInsights(result.data);
  let md = header(result, 'Quảng cáo TikTok Shop');
  md += '\n| Quảng cáo | Nhà quảng cáo | Impressions | CTR |\n';
  md += '|----------|---------------|-------------|-----|\n';
  for (const a of ads) {
    md += `| ${a.title} | ${a.advertiser ?? '—'} | ${a.impressions ?? '—'} | ${a.ctr ?? '—'} |\n`;
  }
  return md;
}

export function formatVoc(
  result: AnalyticsResult<{ summary: string; painPoints: unknown; praises: unknown }>,
): string {
  const painPoints = ensureStringArray(result.data.painPoints);
  const praises = ensureStringArray(result.data.praises);
  let md = header(result, 'VOC — Voice of Customer');
  md += `\n${result.data.summary ?? ''}\n\n`;
  md += `### Điểm đau\n${painPoints.map((p) => `- ${p}`).join('\n') || '—'}\n\n`;
  md += `### Điểm khen\n${praises.map((p) => `- ${p}`).join('\n') || '—'}\n`;
  return md;
}
