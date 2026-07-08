import { NextResponse } from 'next/server';
import { handleApiError, apiError } from '@/lib/trend-intelligence/api/errors';
import { CrawlTickBodySchema } from '@/lib/trend-intelligence/schemas/api';
import { runCrawlTick } from '@/lib/trend-intelligence/workers/crawl-tick';

function assertWorkerSecret(secret: string) {
  const expected = process.env.CRAWL_WORKER_SECRET;
  if (!expected || secret !== expected) {
    return apiError('Unauthorized', 401);
  }
  return null;
}

/** POST /api/tiktok/internal/crawl/tick — Vercel cron / manual worker */
export async function POST(request: Request) {
  try {
    const body = CrawlTickBodySchema.parse(await request.json());
    const authError = assertWorkerSecret(body.secret);
    if (authError) return authError;

    const result = await runCrawlTick(body.limit ?? 3);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

/** GET — Vercel Cron invokes GET with Authorization header */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET ?? process.env.CRAWL_WORKER_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return apiError('Unauthorized', 401);
    }

    const result = await runCrawlTick(3);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
