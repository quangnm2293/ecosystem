import { getProductRank } from '@/lib/fastmoss/service';
import type { RankPeriod, TikTokRegion } from '@/lib/fastmoss/types';
import type { CrawlJob } from '@/lib/trend-intelligence/domain/types';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';
import { categoryRepository } from '@/lib/trend-intelligence/repositories/category.repository';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import { productIngestRepository } from '@/lib/trend-intelligence/repositories/product-ingest.repository';
import {
  CRAWL_PRODUCT_RANK_SOURCE,
  processCrawlProductRankJob,
  type SeedProduct,
} from '@/lib/trend-intelligence/workers/sources/crawl-product-rank';
import {
  CRAWL_SHOP_LISTING_SOURCE,
  processShopListingJob,
} from '@/lib/trend-intelligence/workers/sources/crawl-shop-listing';
import {
  CRAWL_WATCHLIST_REFRESH_SOURCE,
  processWatchlistRefreshJob,
} from '@/lib/trend-intelligence/workers/sources/crawl-watchlist-refresh';
import {
  loadSeedFile,
  listSeedCategorySlugs,
  loadShopSeeds,
} from '@/lib/trend-intelligence/seeds/load-seeds';

function allowAiEstimate(): boolean {
  return process.env.ALLOW_AI_ESTIMATE === '1' || process.env.ALLOW_AI_ESTIMATE === 'true';
}

type LegacyFastmossParams = {
  region: string;
  categorySlug: string;
  period?: RankPeriod;
};

function parseLegacyParams(job: CrawlJob): LegacyFastmossParams {
  const p = job.params as Record<string, unknown>;
  const region = 'VN';
  const categorySlug = String(p.categorySlug ?? p.category ?? '');
  const period = (p.period as RankPeriod | undefined) ?? '7d';
  if (!categorySlug) throw new Error('crawl job missing categorySlug');
  return { region, categorySlug, period };
}

/** Legacy FastMoss / AI path — chỉ khi ALLOW_AI_ESTIMATE=1 hoặc source cũ còn trong queue */
async function processLegacyFastmossJob(job: CrawlJob) {
  if (!allowAiEstimate()) {
    throw new Error(
      'fastmoss:product-rank disabled. Use crawl:product-rank + seeds, or set ALLOW_AI_ESTIMATE=1',
    );
  }

  const { region, categorySlug, period } = parseLegacyParams(job);
  const category = await categoryRepository.findBySlug(region as Region, categorySlug);
  if (!category) throw new Error(`Unknown category: ${categorySlug} (${region})`);

  const result = await getProductRank({
    region: region as TikTokRegion,
    category: category.name,
    period: period ?? '7d',
  });

  if (!result.data.length) {
    throw new Error('No products returned from ingest source');
  }

  const ingest = await productIngestRepository.ingestRankedProducts({
    region,
    categoryId: category.id,
    items: result.data,
    source: result.source,
  });

  await crawlRepository.saveSnapshot({
    jobId: job.id,
    source: result.source,
    storageUrl: `inline://${job.id}`,
    sizeBytes: JSON.stringify(result.data).length,
  });

  return {
    jobId: job.id,
    source: result.source,
    note: result.note,
    ...ingest,
  };
}

export async function runCrawlTick(limit = 3) {
  const results: Array<Record<string, unknown>> = [];

  for (let i = 0; i < limit; i++) {
    const job = await crawlRepository.claimNext();
    if (!job) break;

    try {
      let output: Record<string, unknown>;
      if (job.source === CRAWL_PRODUCT_RANK_SOURCE) {
        output = await processCrawlProductRankJob(job);
      } else if (job.source === CRAWL_SHOP_LISTING_SOURCE) {
        output = await processShopListingJob(job);
      } else if (job.source === CRAWL_WATCHLIST_REFRESH_SOURCE) {
        output = await processWatchlistRefreshJob(job);
      } else if (job.source === 'fastmoss:product-rank') {
        output = await processLegacyFastmossJob(job);
      } else {
        throw new Error(`Unsupported crawl source: ${job.source}`);
      }

      await crawlRepository.markCompleted(job.id);
      results.push({ status: 'completed', ...output });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Crawl failed';
      await crawlRepository.markFailed(job.id, message, job);
      results.push({ status: 'failed', jobId: job.id, error: message });
    }
  }

  return { processed: results.length, results };
}

export async function enqueueSeedCategoryCrawl(options: {
  region?: string;
  categorySlug: string;
  delayMs?: number;
}) {
  const region = 'VN';
  const seed = await loadSeedFile(region, options.categorySlug);
  const products: SeedProduct[] = seed.products;

  const job = await crawlRepository.enqueue({
    source: CRAWL_PRODUCT_RANK_SOURCE,
    params: {
      region: seed.region,
      categorySlug: seed.categorySlug,
      products,
      delayMs: options.delayMs ?? 1_500,
    },
  });

  return { id: job.id, category: seed.categorySlug, productCount: products.length };
}

export async function enqueueDefaultCategoryCrawls(_region = 'VN') {
  const region = 'VN';
  const slugs = await listSeedCategorySlugs(region);
  const categories =
    slugs.length > 0
      ? slugs
      : (await categoryRepository.listByRegion(region as Region)).map((c) => c.slug);

  const jobs = [];

  for (const categorySlug of categories) {
    try {
      const job = await enqueueSeedCategoryCrawl({ region, categorySlug });
      jobs.push({ id: job.id, category: job.category, productCount: job.productCount });
    } catch (err) {
      jobs.push({
        id: null,
        category: categorySlug,
        error: err instanceof Error ? err.message : 'enqueue failed',
      });
    }
  }

  return { enqueued: jobs.filter((j) => j.id).length, jobs };
}

export async function enqueueShopListingCrawls(_region = 'VN') {
  const region = 'VN';
  const file = await loadShopSeeds(region);
  const jobs = [];

  for (const shop of file.shops) {
    const job = await crawlRepository.enqueue({
      source: CRAWL_SHOP_LISTING_SOURCE,
      params: {
        region: file.region,
        categorySlug: shop.categorySlug,
        shopUrl: shop.shopUrl,
        shopName: shop.shopName,
        maxProducts: shop.maxProducts ?? 24,
      },
    });
    jobs.push({
      id: job.id,
      category: shop.categorySlug,
      shopUrl: shop.shopUrl,
    });
  }

  return { enqueued: jobs.length, jobs };
}
