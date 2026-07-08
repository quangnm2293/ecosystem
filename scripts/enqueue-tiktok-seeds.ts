/**
 * Enqueue crawl:product-rank jobs from data/tiktok-seeds/*.json
 *
 *   pnpm run tiktok:enqueue-seeds
 *   pnpm run tiktok:enqueue-seeds -- beauty
 *   pnpm run tiktok:enqueue-seeds -- '*'
 */
import 'dotenv/config';
import {
  enqueueDefaultCategoryCrawls,
  enqueueSeedCategoryCrawl,
  runCrawlTick,
} from '@/lib/trend-intelligence/workers/crawl-tick';

async function main() {
  const arg = process.argv.slice(2).find((a) => a !== '--') ?? 'beauty';
  const runTick = process.argv.includes('--tick');
  const region = 'VN';

  let result: { enqueued: number; jobs: unknown[] };

  if (arg === '*') {
    result = await enqueueDefaultCategoryCrawls(region);
  } else {
    const job = await enqueueSeedCategoryCrawl({ region, categorySlug: arg });
    result = {
      enqueued: 1,
      jobs: [{ id: job.id, category: job.category, productCount: job.productCount }],
    };
  }

  console.log(JSON.stringify(result, null, 2));

  if (runTick) {
    const limit = Math.max(1, result.enqueued);
    console.log(`\n→ runCrawlTick(${limit})…`);
    const tick = await runCrawlTick(limit);
    console.log(JSON.stringify(tick, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
