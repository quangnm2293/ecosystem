import { getProductRank } from '@/lib/fastmoss/service';
import type { RankPeriod, TikTokRegion } from '@/lib/fastmoss/types';
import type { CrawlJob } from '@/lib/trend-intelligence/domain/types';
import { categoryRepository } from '@/lib/trend-intelligence/repositories/category.repository';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import { productIngestRepository } from '@/lib/trend-intelligence/repositories/product-ingest.repository';

type ProductRankJobParams = {
  region: string;
  categorySlug: string;
  period?: RankPeriod;
};

function parseJobParams(job: CrawlJob): ProductRankJobParams {
  const p = job.params as Record<string, unknown>;
  const region = String(p.region ?? 'VN');
  const categorySlug = String(p.categorySlug ?? p.category ?? '');
  const period = (p.period as RankPeriod | undefined) ?? '7d';
  if (!categorySlug) throw new Error('crawl job missing categorySlug');
  return { region, categorySlug, period };
}

async function processProductRankJob(job: CrawlJob) {
  const { region, categorySlug, period } = parseJobParams(job);
  const category = await categoryRepository.findBySlug(region as 'VN', categorySlug);
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
      if (job.source === 'fastmoss:product-rank') {
        output = await processProductRankJob(job);
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

export async function enqueueDefaultCategoryCrawls(region = 'VN') {
  const categories = await categoryRepository.listByRegion(region as 'VN');
  const jobs = [];

  for (const cat of categories) {
    const job = await crawlRepository.enqueue({
      source: 'fastmoss:product-rank',
      params: { region, categorySlug: cat.slug, period: '7d' },
    });
    jobs.push({ id: job.id, category: cat.slug });
  }

  return { enqueued: jobs.length, jobs };
}
