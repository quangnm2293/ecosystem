/** HTTP fetch helpers for TikTok crawl — UA rotation, jitter, retry/backoff */

const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

export function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

export function jitterDelayMs(minMs = 1_000, maxMs = 3_000): number {
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FetchHtmlResult = {
  html: string;
  url: string;
  status: number;
  userAgent: string;
  attempts: number;
};

export type FetchHtmlOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxAttempts?: number;
  proxyUrl?: string;
};

function proxyFetchUrl(target: string, proxyUrl: string): string {
  // Generic forward proxy style: PROXY?url=ENCODED — optional env CRAWL_PROXY_URL
  const base = proxyUrl.replace(/\/$/, '');
  if (base.includes('{url}')) return base.replace('{url}', encodeURIComponent(target));
  return `${base}${base.includes('?') ? '&' : '?'}url=${encodeURIComponent(target)}`;
}

export async function fetchHtmlWithBackoff(
  url: string,
  options: FetchHtmlOptions = {},
): Promise<FetchHtmlResult> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxBytes = options.maxBytes ?? 768_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const proxyUrl = options.proxyUrl ?? process.env.CRAWL_PROXY_URL?.trim();

  let lastError = 'fetch failed';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userAgent = pickUserAgent();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const fetchUrl = proxyUrl ? proxyFetchUrl(url, proxyUrl) : url;

    try {
      if (attempt > 1) {
        await sleep(jitterDelayMs(800 * attempt, 1_800 * attempt));
      }

      const res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      if (res.status === 403 || res.status === 429) {
        lastError = `HTTP ${res.status}`;
        continue;
      }

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (res.status >= 500) continue;
        throw new Error(lastError);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No body');

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) break;
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

      return {
        html,
        url: res.url || url,
        status: res.status,
        userAgent,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = 'timeout';
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(lastError);
}
