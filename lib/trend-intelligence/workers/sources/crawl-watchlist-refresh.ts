import type { CrawlJob } from '@/lib/trend-intelligence/domain/types';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import { getTiktokDb } from '@/lib/trend-intelligence/repositories/tiktok-db';
import { CRAWL_PRODUCT_RANK_SOURCE } from '@/lib/trend-intelligence/workers/sources/crawl-product-rank';
import { TiktokSubscriptionTier } from '@/lib/trend-intelligence/domain/enums';

export const CRAWL_WATCHLIST_REFRESH_SOURCE = 'crawl:watchlist-refresh';

type WatchlistRefreshParams = {
  userId?: string;
  maxProducts?: number;
};

function parseParams(job: CrawlJob): WatchlistRefreshParams {
  const p = job.params as Record<string, unknown>;
  return {
    userId: typeof p.userId === 'string' ? p.userId : undefined,
    maxProducts: typeof p.maxProducts === 'number' ? p.maxProducts : 40,
  };
}

/**
 * Collect watchlist product URLs and enqueue crawl:product-rank batches.
 * Prefer Pro+ users first when refreshAll.
 */
export async function processWatchlistRefreshJob(job: CrawlJob) {
  const params = parseParams(job);
  const db = getTiktokDb();

  let watchlistQuery = db.from('watchlists').select('id, user_id');
  if (params.userId) {
    watchlistQuery = watchlistQuery.eq('user_id', params.userId);
  }

  const { data: watchlists, error: wlError } = await watchlistQuery.limit(100);
  if (wlError) throw wlError;
  if (!watchlists?.length) {
    return { jobId: job.id, source: CRAWL_WATCHLIST_REFRESH_SOURCE, followUps: 0, note: 'no watchlists' };
  }

  // Tier preference: load subscriptions for users
  const userIds = [...new Set((watchlists as Array<{ user_id: string }>).map((w) => w.user_id))];
  const { data: subs } = await db.from('subscriptions').select('user_id, tier').in('user_id', userIds);
  const tierMap = new Map(
    ((subs ?? []) as Array<{ user_id: string; tier: string }>).map((s) => [s.user_id, s.tier]),
  );

  const proFirst = [...(watchlists as Array<{ id: string; user_id: string }>)].sort((a, b) => {
    const ta = tierMap.get(a.user_id) ?? TiktokSubscriptionTier.FREE;
    const tb = tierMap.get(b.user_id) ?? TiktokSubscriptionTier.FREE;
    const score = (t: string) =>
      t === TiktokSubscriptionTier.ENTERPRISE
        ? 4
        : t === TiktokSubscriptionTier.AGENCY
          ? 3
          : t === TiktokSubscriptionTier.PRO
            ? 2
            : 1;
    return score(tb) - score(ta);
  });

  const productIds: string[] = [];
  for (const wl of proFirst) {
    const { data: items } = await db
      .from('watchlist_items')
      .select('product_id')
      .eq('watchlist_id', wl.id)
      .limit(params.maxProducts ?? 40);
    for (const it of (items ?? []) as Array<{ product_id: string }>) {
      if (!productIds.includes(it.product_id)) productIds.push(it.product_id);
    }
    if (productIds.length >= (params.maxProducts ?? 40)) break;
  }

  if (productIds.length === 0) {
    return { jobId: job.id, source: CRAWL_WATCHLIST_REFRESH_SOURCE, followUps: 0, note: 'empty watchlists' };
  }

  const { data: products } = await db
    .from('products')
    .select('id, product_url, title, slug, category_id')
    .in('id', productIds.slice(0, params.maxProducts ?? 40))
    .eq('region', 'VN');

  const byCategory = new Map<string, Array<{ url: string; title?: string }>>();
  for (const p of (products ?? []) as Array<{
    id: string;
    product_url: string | null;
    title: string;
    category_id: string | null;
  }>) {
    if (!p.product_url || !p.category_id) continue;
    const list = byCategory.get(p.category_id) ?? [];
    list.push({ url: p.product_url, title: p.title });
    byCategory.set(p.category_id, list);
  }

  // Need category slugs for crawl jobs
  const categoryIds = [...byCategory.keys()];
  const { data: cats } = await db.from('categories').select('id, slug').in('id', categoryIds);
  const slugById = new Map(
    ((cats ?? []) as Array<{ id: string; slug: string }>).map((c) => [c.id, c.slug]),
  );

  const followUps = [];
  for (const [categoryId, productsForCat] of byCategory) {
    const categorySlug = slugById.get(categoryId);
    if (!categorySlug || productsForCat.length === 0) continue;

    const follow = await crawlRepository.enqueue({
      source: CRAWL_PRODUCT_RANK_SOURCE,
      params: {
        region: 'VN',
        categorySlug,
        products: productsForCat,
        delayMs: 2_000,
      },
    });
    followUps.push({ id: follow.id, category: categorySlug, count: productsForCat.length });
  }

  return {
    jobId: job.id,
    source: CRAWL_WATCHLIST_REFRESH_SOURCE,
    followUps: followUps.length,
    jobs: followUps,
  };
}

export async function enqueueWatchlistRefresh(userId?: string) {
  const job = await crawlRepository.enqueue({
    source: CRAWL_WATCHLIST_REFRESH_SOURCE,
    params: { userId, maxProducts: 40, region: 'VN' },
  });
  return { id: job.id };
}
