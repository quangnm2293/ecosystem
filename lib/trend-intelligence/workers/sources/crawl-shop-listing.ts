import {
  extractProductUrlsFromHtml,
  fetchTikTokHtml,
  isTikTokShopBlockedPage,
} from '@/lib/scraper/tiktok-shop';
import type { CrawlJob } from '@/lib/trend-intelligence/domain/types';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';
import { categoryRepository } from '@/lib/trend-intelligence/repositories/category.repository';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import { saveCrawlSnapshot } from '@/lib/trend-intelligence/snapshots/store';
import { CRAWL_PRODUCT_RANK_SOURCE } from '@/lib/trend-intelligence/workers/sources/crawl-product-rank';
import { jitterDelayMs, sleep } from '@/lib/scraper/fetch-with-backoff';

export const CRAWL_SHOP_LISTING_SOURCE = 'crawl:shop-listing';

type ShopListingParams = {
  region: string;
  categorySlug: string;
  shopUrl: string;
  shopName?: string;
  maxProducts?: number;
};

function parseParams(job: CrawlJob): ShopListingParams {
  const p = job.params as Record<string, unknown>;
  const region = 'VN';
  const categorySlug = String(p.categorySlug ?? '');
  const shopUrl = String(p.shopUrl ?? '');
  if (!categorySlug) throw new Error('crawl:shop-listing missing categorySlug');
  if (!shopUrl) throw new Error('crawl:shop-listing missing shopUrl');
  return {
    region,
    categorySlug,
    shopUrl,
    shopName: p.shopName != null ? String(p.shopName) : undefined,
    maxProducts: typeof p.maxProducts === 'number' ? p.maxProducts : 24,
  };
}

export async function processShopListingJob(job: CrawlJob) {
  const params = parseParams(job);
  const category = await categoryRepository.findBySlug(
    params.region as Region,
    params.categorySlug,
  );
  if (!category) {
    throw new Error(`Unknown category: ${params.categorySlug}`);
  }

  await sleep(jitterDelayMs(1_000, 2_500));
  const { html, finalUrl } = await fetchTikTokHtml(params.shopUrl);

  if (isTikTokShopBlockedPage(html, null)) {
    const snap = await saveCrawlSnapshot({
      jobId: job.id,
      source: CRAWL_SHOP_LISTING_SOURCE,
      html,
    });
    await crawlRepository.saveSnapshot({
      jobId: job.id,
      source: CRAWL_SHOP_LISTING_SOURCE,
      storageUrl: snap.storageUrl,
      sizeBytes: snap.sizeBytes,
    });
    throw new Error('Shop listing blocked by Security Check');
  }

  const productUrls = extractProductUrlsFromHtml(html, params.maxProducts ?? 24);
  const snap = await saveCrawlSnapshot({
    jobId: job.id,
    source: CRAWL_SHOP_LISTING_SOURCE,
    html: html.slice(0, 400_000),
    meta: { finalUrl, found: productUrls.length },
  });
  await crawlRepository.saveSnapshot({
    jobId: job.id,
    source: CRAWL_SHOP_LISTING_SOURCE,
    storageUrl: snap.storageUrl,
    sizeBytes: snap.sizeBytes,
  });

  if (productUrls.length === 0) {
    throw new Error(`No products found on shop page: ${params.shopUrl}`);
  }

  const followUp = await crawlRepository.enqueue({
    source: CRAWL_PRODUCT_RANK_SOURCE,
    params: {
      region: params.region,
      categorySlug: params.categorySlug,
      products: productUrls.map((url) => ({
        url,
        shopName: params.shopName,
      })),
      delayMs: 2_000,
    },
  });

  return {
    jobId: job.id,
    source: CRAWL_SHOP_LISTING_SOURCE,
    shopUrl: params.shopUrl,
    found: productUrls.length,
    followUpJobId: followUp.id,
    snapshotUploaded: snap.uploaded,
    productUrls: productUrls.slice(0, 10),
  };
}
