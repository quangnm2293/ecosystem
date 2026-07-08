import { NextResponse } from 'next/server';
import { handleApiError, apiError } from '@/lib/trend-intelligence/api/errors';
import { CrawlTickBodySchema } from '@/lib/trend-intelligence/schemas/api';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import {
  enqueueDefaultCategoryCrawls,
  runCrawlTick,
} from '@/lib/trend-intelligence/workers/crawl-tick';
import { evaluateAlerts } from '@/lib/trend-intelligence/workers/evaluate-alerts';
import { enqueueWatchlistRefresh } from '@/lib/trend-intelligence/workers/sources/crawl-watchlist-refresh';

function assertWorkerSecret(secret: string) {
  const expected = process.env.CRAWL_WORKER_SECRET;
  if (!expected || secret !== expected) {
    return apiError('Unauthorized', 401);
  }
  return null;
}

/**
 * Daily cron / manual tick (VN).
 * Empty queue → seed crawl jobs; always enqueue watchlist refresh + run alerts after tick.
 */
async function tick(options: { limit: number; autoEnqueue: boolean }) {
  let enqueued: Awaited<ReturnType<typeof enqueueDefaultCategoryCrawls>> | null = null;
  let watchlistJob: { id: string } | null = null;

  if (options.autoEnqueue) {
    const pending = await crawlRepository.countPending();
    if (pending === 0) {
      enqueued = await enqueueDefaultCategoryCrawls();
    }
    watchlistJob = await enqueueWatchlistRefresh();
  }

  const result = await runCrawlTick(options.limit);
  const alerts = await evaluateAlerts(50);

  return { enqueued, watchlistJob, alerts, ...result };
}

/** POST /api/tiktok/internal/crawl/tick */
export async function POST(request: Request) {
  try {
    const body = CrawlTickBodySchema.parse(await request.json());
    const authError = assertWorkerSecret(body.secret);
    if (authError) return authError;

    const result = await tick({
      limit: body.limit ?? 7,
      autoEnqueue: body.autoEnqueue ?? true,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

/** GET — Vercel Cron (daily) */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET ?? process.env.CRAWL_WORKER_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return apiError('Unauthorized', 401);
    }

    const result = await tick({ limit: 7, autoEnqueue: true });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
