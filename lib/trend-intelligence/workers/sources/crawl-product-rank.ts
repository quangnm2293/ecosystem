import { crawlProductByUrl } from '@/lib/fastmoss/crawl';
import type { ProductRankItem } from '@/lib/fastmoss/types';
import { jitterDelayMs, sleep } from '@/lib/scraper/fetch-with-backoff';
import type { CrawlJob } from '@/lib/trend-intelligence/domain/types';
import type { Region } from '@/lib/trend-intelligence/domain/value-objects/region';
import { categoryRepository } from '@/lib/trend-intelligence/repositories/category.repository';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import { productIngestRepository } from '@/lib/trend-intelligence/repositories/product-ingest.repository';
import { saveCrawlSnapshot } from '@/lib/trend-intelligence/snapshots/store';

export const CRAWL_PRODUCT_RANK_SOURCE = 'crawl:product-rank';

export type SeedProduct = {
  url: string;
  /** Used only when live crawl is blocked (Security Check) */
  title?: string;
  price?: string;
  shopName?: string;
  imageUrl?: string;
};

export type CrawlProductRankParams = {
  region: string;
  categorySlug: string;
  products: SeedProduct[];
  delayMs?: number;
};

function parseParams(job: CrawlJob): CrawlProductRankParams {
  const p = job.params as Record<string, unknown>;
  const region = 'VN';
  const categorySlug = String(p.categorySlug ?? p.category ?? '');
  if (!categorySlug) throw new Error('crawl job missing categorySlug');

  const rawProducts = Array.isArray(p.products)
    ? p.products
    : Array.isArray(p.productUrls)
      ? (p.productUrls as unknown[]).map((url) => ({ url: String(url) }))
      : [];

  const products: SeedProduct[] = rawProducts
    .map((item) => {
      if (typeof item === 'string') return { url: item };
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        if (!o.url) return null;
        return {
          url: String(o.url),
          title: o.title != null ? String(o.title) : undefined,
          price: o.price != null ? String(o.price) : undefined,
          shopName: o.shopName != null ? String(o.shopName) : undefined,
          imageUrl: o.imageUrl != null ? String(o.imageUrl) : undefined,
        };
      }
      return null;
    })
    .filter((x): x is SeedProduct => Boolean(x?.url));

  if (products.length === 0) {
    throw new Error('crawl:product-rank requires products[] or productUrls[]');
  }

  return {
    region,
    categorySlug,
    products,
    delayMs: typeof p.delayMs === 'number' ? p.delayMs : 1_500,
  };
}

function fromSeedHint(seed: SeedProduct, rank: number): ProductRankItem {
  return {
    rank,
    title: seed.title ?? 'Sản phẩm (seed)',
    price: seed.price,
    productUrl: seed.url,
    imageUrl: seed.imageUrl,
    shopName: seed.shopName,
  };
}

async function crawlOne(seed: SeedProduct, rank: number): Promise<{
  item: ProductRankItem;
  mode: 'crawl' | 'seed-hint';
  error?: string;
}> {
  try {
    const crawled = await crawlProductByUrl(seed.url);
    return {
      mode: 'crawl',
      item: {
        ...crawled,
        rank,
        title: crawled.title && crawled.title !== 'Sản phẩm' ? crawled.title : (seed.title ?? crawled.title),
        price: crawled.price ?? seed.price,
        imageUrl: crawled.imageUrl ?? seed.imageUrl,
        shopName: crawled.shopName ?? seed.shopName,
        productUrl: crawled.productUrl ?? seed.url,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'crawl failed';
    if (seed.title) {
      return { mode: 'seed-hint', item: fromSeedHint(seed, rank), error: message };
    }
    throw err;
  }
}

export async function processCrawlProductRankJob(job: CrawlJob) {
  const params = parseParams(job);
  const category = await categoryRepository.findBySlug(
    params.region as Region,
    params.categorySlug,
  );
  if (!category) {
    throw new Error(`Unknown category: ${params.categorySlug} (${params.region})`);
  }

  const items: ProductRankItem[] = [];
  const modes: Array<'crawl' | 'seed-hint'> = [];
  const errors: string[] = [];

  for (let i = 0; i < params.products.length; i++) {
    if (i > 0) {
      const base = params.delayMs ?? 1_500;
      await sleep(jitterDelayMs(Math.max(800, base - 500), base + 1_500));
    }

    try {
      const result = await crawlOne(params.products[i], i + 1);
      items.push(result.item);
      modes.push(result.mode);
      if (result.error) errors.push(`${params.products[i].url}: ${result.error}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'crawl failed';
      errors.push(`${params.products[i].url}: ${message}`);
    }
  }

  if (items.length === 0) {
    throw new Error(
      `No products crawled (${errors.length} failures). ${errors.slice(0, 3).join(' | ')}`,
    );
  }

  const crawledCount = modes.filter((m) => m === 'crawl').length;
  const hintCount = modes.filter((m) => m === 'seed-hint').length;
  const source = crawledCount > 0 ? 'crawl' : 'seed-hint';

  const ingest = await productIngestRepository.ingestRankedProducts({
    region: params.region,
    categoryId: category.id,
    items,
    source,
  });

  const snap = await saveCrawlSnapshot({
    jobId: job.id,
    source,
    meta: { items, errors, modes, crawledCount, hintCount },
  });

  await crawlRepository.saveSnapshot({
    jobId: job.id,
    source,
    storageUrl: snap.storageUrl,
    sizeBytes: snap.sizeBytes,
  });

  return {
    jobId: job.id,
    source,
    crawledCount,
    hintCount,
    failedCount: errors.length,
    snapshotUploaded: snap.uploaded,
    errors: errors.slice(0, 10),
    note:
      hintCount > 0
        ? `${crawledCount} live crawl, ${hintCount} seed-hint (bot blocked).`
        : `Crawled ${crawledCount} PDP pages.`,
    ...ingest,
  };
}
