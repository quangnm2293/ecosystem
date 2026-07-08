/**
 * Enqueue crawl:shop-listing jobs from data/tiktok-seeds/vn-shops.json
 *
 *   pnpm run tiktok:enqueue-shops
 *   pnpm run tiktok:enqueue-shops -- --tick
 */
import 'dotenv/config';
import {
  enqueueShopListingCrawls,
  runCrawlTick,
} from '@/lib/trend-intelligence/workers/crawl-tick';

async function main() {
  const runTick = process.argv.includes('--tick');
  const result = await enqueueShopListingCrawls('VN');
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
