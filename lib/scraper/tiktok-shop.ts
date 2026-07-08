import type { ProductPageData } from '@/lib/scraper/product-url';
import { fetchHtmlWithBackoff } from '@/lib/scraper/fetch-with-backoff';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 768_000;

export type TikTokShopRef = {
  productId: string;
  region?: string;
};

const TIKTOK_SHOP_HOSTS = new Set(['shop.tiktok.com', 'www.tiktok.com', 'tiktok.com']);

/** shop.tiktok.com/view/product/ID, tiktok.com/shop/pdp/slug/ID, /vn/pdp/ID, ... */
export function parseTikTokShopUrl(raw: string): TikTokShopRef | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  if (!TIKTOK_SHOP_HOSTS.has(host) && !host.endsWith('.tiktok.com')) return null;

  const path = parsed.pathname;

  const viewMatch = path.match(/\/view\/product\/(\d{10,25})/i);
  if (viewMatch) return { productId: viewMatch[1] };

  const pdpMatch = path.match(/\/(?:shop\/)?pdp\/(?:[^/]+\/)?(\d{10,25})/i);
  if (pdpMatch) return { productId: pdpMatch[1] };

  const regionPdpMatch = path.match(/\/([a-z]{2})\/pdp\/(?:[^/]+\/)?(\d{10,25})/i);
  if (regionPdpMatch) return { productId: regionPdpMatch[2], region: regionPdpMatch[1].toUpperCase() };

  const bareMatch = path.match(/^\/(\d{10,25})\/?$/);
  if (bareMatch && host.includes('tiktok')) return { productId: bareMatch[1] };

  return null;
}

export function isTikTokShopBlockedPage(html: string, title: string | null): boolean {
  const t = (title ?? '').toLowerCase();
  if (t.includes('security check')) return true;
  if (html.includes('oec-ttweb-captcha') || html.includes('id="captcha_container"')) return true;
  return false;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return null;
}

function extractTitle(html: string): string | null {
  return extractMeta(html, 'og:title') ?? extractMeta(html, 'twitter:title') ?? null;
}

export function cleanTikTokShopDescription(desc: string): string {
  return desc
    .replace(/^(?:Buy|Mua)\s+/i, '')
    .replace(/\s+(?:on|trên)\s+TikTok Shop\.[\s\S]*$/i, '')
    .replace(/\s*Discover great prices[\s\S]*$/i, '')
    .replace(/\s*Shop now for exclusive deals!?\s*$/i, '')
    .replace(/\s*Khám phá giá tốt[\s\S]*$/i, '')
    .trim();
}

function extractPriceFromHtml(html: string): string | null {
  const formatMatch = html.match(/"sale_price_format":"([^"]+)"/);
  const currencyMatch = html.match(/"currency_symbol":"([^"]+)"/);
  if (formatMatch) {
    const sym = currencyMatch?.[1] ?? '₫';
    return `${formatMatch[1]}${sym}`;
  }

  const decimalMatch = html.match(/"sale_price_decimal":"(\d+)"/);
  if (decimalMatch && currencyMatch) {
    const n = Number(decimalMatch[1]);
    if (!Number.isNaN(n)) {
      const formatted = n >= 1000 ? Math.round(n / 1000) * 1000 : n;
      return `${formatted.toLocaleString('vi-VN')}${currencyMatch[1]}`;
    }
  }

  const visible = html.match(/(\d{1,3}(?:\.\d{3})+)\s*₫/);
  return visible ? `${visible[1]}₫` : null;
}

function extractDiscount(html: string): string | null {
  return html.match(/"discount_format":"([^"]+)"/)?.[1] ?? null;
}

function buildPdpUrls(ref: TikTokShopRef): string[] {
  const { productId } = ref;
  // Chỉ crawl PDP Việt Nam
  return [
    `https://www.tiktok.com/vn/pdp/${productId}`,
    `https://shop.tiktok.com/vn/pdp/${productId}`,
    `https://www.tiktok.com/view/product/${productId}`,
    `https://www.tiktok.com/shop/pdp/${productId}`,
  ];
}

async function fetchHtml(url: string): Promise<string> {
  const result = await fetchHtmlWithBackoff(url, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: MAX_BYTES,
    maxAttempts: 3,
  });
  return result.html;
}

/** Public helper for discovery / snapshot callers */
export async function fetchTikTokHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const result = await fetchHtmlWithBackoff(url, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: MAX_BYTES,
    maxAttempts: 3,
  });
  return { html: result.html, finalUrl: result.url };
}

/** Extract product IDs / PDP URLs from a shop or listing HTML page */
export function extractProductUrlsFromHtml(html: string, limit = 40): string[] {
  const ids = new Set<string>();

  const patterns = [
    /\/view\/product\/(\d{10,25})/gi,
    /\/(?:shop\/)?pdp\/(?:[^"'/\s]+\/)?(\d{10,25})/gi,
    /\/([a-z]{2})\/pdp\/(?:[^"'/\s]+\/)?(\d{10,25})/gi,
    /"product_id"\s*:\s*"(\d{10,25})"/gi,
    /"productId"\s*:\s*"(\d{10,25})"/gi,
  ];

  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const id = m[2] ?? m[1];
      if (id) ids.add(id);
      if (ids.size >= limit) break;
    }
    if (ids.size >= limit) break;
  }

  return [...ids].slice(0, limit).map((id) => `https://www.tiktok.com/view/product/${id}`);
}

function parseTikTokShopHtml(html: string, canonicalUrl: string): ProductPageData | null {
  const title = extractTitle(html);
  if (isTikTokShopBlockedPage(html, title)) return null;

  const rawDesc =
    extractMeta(html, 'og:description') ??
    extractMeta(html, 'description') ??
    extractMeta(html, 'twitter:description');
  const description = rawDesc ? cleanTikTokShopDescription(rawDesc) : null;
  const imageUrl = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image');
  const price = extractPriceFromHtml(html);
  const discount = extractDiscount(html);

  if (!title && !description) return null;

  const parts = [
    title ? `Tên: ${title}` : '',
    description ? `Mô tả: ${description}` : '',
    price ? `Giá: ${price}${discount ? ` (giảm ${discount})` : ''}` : '',
  ].filter(Boolean);

  return {
    url: canonicalUrl,
    title,
    description,
    imageUrl,
    price,
    textSnippet: parts.join('\n'),
    source: 'tiktok-shop-pdp',
    productId: parseTikTokShopUrl(canonicalUrl)?.productId,
  };
}

export async function fetchTikTokShopProduct(
  ref: TikTokShopRef,
  originalUrl: string,
): Promise<ProductPageData> {
  const urls = buildPdpUrls(ref);
  let lastError = 'Không tải được trang sản phẩm TikTok Shop';

  for (const fetchUrl of urls) {
    try {
      const html = await fetchHtml(fetchUrl);
      const parsed = parseTikTokShopHtml(html, originalUrl);
      if (parsed?.title || parsed?.description) {
        return {
          ...parsed,
          url: originalUrl,
          productId: ref.productId,
          source: 'tiktok-shop-pdp',
        };
      }
      lastError =
        'TikTok Shop chặn bot (Security Check). Thử lại sau hoặc dán thêm mô tả sản phẩm vào form.';
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }

  throw new Error(lastError);
}

export function isTikTokShopUrl(raw: string): boolean {
  return parseTikTokShopUrl(raw) !== null;
}
