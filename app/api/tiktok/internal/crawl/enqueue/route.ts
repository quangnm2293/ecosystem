import { NextResponse } from 'next/server';
import { handleApiError, apiError } from '@/lib/trend-intelligence/api/errors';
import { CrawlEnqueueBodySchema } from '@/lib/trend-intelligence/schemas/api';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import { enqueueDefaultCategoryCrawls } from '@/lib/trend-intelligence/workers/crawl-tick';

function assertWorkerSecret(secret: string) {
  const expected = process.env.CRAWL_WORKER_SECRET;
  if (!expected || secret !== expected) {
    return apiError('Unauthorized', 401);
  }
  return null;
}

/** POST /api/tiktok/internal/crawl/enqueue */
export async function POST(request: Request) {
  try {
    const body = CrawlEnqueueBodySchema.parse(await request.json());
    const authError = assertWorkerSecret(body.secret);
    if (authError) return authError;

    if (body.categorySlug === '*') {
      const result = await enqueueDefaultCategoryCrawls(body.region);
      return NextResponse.json(result);
    }

    const job = await crawlRepository.enqueue({
      source: 'fastmoss:product-rank',
      params: {
        region: body.region,
        categorySlug: body.categorySlug,
        period: body.period,
      },
    });

    return NextResponse.json({ enqueued: 1, jobs: [{ id: job.id, category: body.categorySlug }] });
  } catch (err) {
    return handleApiError(err);
  }
}
