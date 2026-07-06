import {
  fetchTikTokShopProduct,
  isTikTokShopBlockedPage,
  parseTikTokShopUrl,
} from '@/lib/scraper/tiktok-shop';

export type ProductPageData = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  textSnippet: string;
  source?: 'generic' | 'tiktok-shop-pdp' | 'user-hint';
  productId?: string;
};

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);
const MAX_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 12_000;

function isPrivateIp(hostname: string): boolean {
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  return false;
}

export function assertSafeProductUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('URL sản phẩm không hợp lệ');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Chỉ hỗ trợ URL http/https');
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || isPrivateIp(host) || host.endsWith('.local')) {
    throw new Error('URL không được phép');
  }

  return parsed;
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
  const og = extractMeta(html, 'og:title');
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessPrice(text: string): string | null {
  const m = text.match(/(?:₫|VND|USD|\$)\s*[\d,.]+|[\d,.]+\s*(?:₫|VND)/i);
  return m?.[0] ?? null;
}

async function fetchGenericProductPage(url: URL): Promise<ProductPageData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; EcosystemBot/1.0; +https://ecosystem-platform.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Không tải được trang (${res.status}). Thử link TikTok Shop / trang sản phẩm trực tiếp.`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Không đọc được nội dung trang');

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) break;
      chunks.push(value);
    }

    const html = new TextDecoder('utf-8', { fatal: false }).decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length);
        merged.set(acc);
        merged.set(c, acc.length);
        return merged;
      }, new Uint8Array()),
    );

    const title = extractTitle(html);
    const description =
      extractMeta(html, 'og:description') ??
      extractMeta(html, 'description') ??
      extractMeta(html, 'twitter:description');
    const imageUrl = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image');
    const price =
      extractMeta(html, 'product:price:amount') ??
      extractMeta(html, 'og:price:amount') ??
      guessPrice(stripHtml(html));

    const textSnippet = stripHtml(html).slice(0, 6000);

    return {
      url: url.toString(),
      title,
      description,
      imageUrl,
      price,
      textSnippet,
      source: 'generic',
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tải trang quá lâu — thử lại hoặc dùng link khác');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function mergeProductHint(page: ProductPageData, hint?: string): ProductPageData {
  const trimmed = hint?.trim();
  if (!trimmed) return page;

  const blocked =
    isTikTokShopBlockedPage('', page.title) ||
    (page.title?.toLowerCase().includes('security check') ?? false);

  if (!blocked && page.description && page.title && page.title.length > 5) {
    return {
      ...page,
      description: `${page.description}\n\nBổ sung từ người dùng: ${trimmed}`,
      textSnippet: `${page.textSnippet}\n\nBổ sung: ${trimmed}`,
    };
  }

  return {
    ...page,
    title: page.title && !blocked ? page.title : trimmed.split('\n')[0].slice(0, 120),
    description: trimmed,
    textSnippet: `Mô tả sản phẩm (người dùng):\n${trimmed}`,
    source: page.source === 'tiktok-shop-pdp' ? 'tiktok-shop-pdp' : 'user-hint',
  };
}

export async function fetchProductPageData(
  rawUrl: string,
  options?: { productHint?: string },
): Promise<ProductPageData> {
  const url = assertSafeProductUrl(rawUrl);
  const tiktokRef = parseTikTokShopUrl(rawUrl);

  let page: ProductPageData;

  if (tiktokRef) {
    try {
      page = await fetchTikTokShopProduct(tiktokRef, url.toString());
    } catch {
      const generic = await fetchGenericProductPage(url);
      if (isTikTokShopBlockedPage('', generic.title) && tiktokRef) {
        throw new Error(
          'TikTok Shop chặn truy cập tự động (Security Check). Dán thêm tên/mô tả sản phẩm vào ô bên dưới.',
        );
      }
      page = generic;
    }
  } else {
    page = await fetchGenericProductPage(url);
    if (isTikTokShopBlockedPage('', page.title)) {
      throw new Error(
        'Trang trả về Security Check — không đọc được mô tả sản phẩm. Dán thêm mô tả thủ công.',
      );
    }
  }

  return mergeProductHint(page, options?.productHint);
}
