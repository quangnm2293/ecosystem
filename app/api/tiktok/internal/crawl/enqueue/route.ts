import { NextResponse } from 'next/server';
import { handleApiError, apiError } from '@/lib/trend-intelligence/api/errors';
import { CrawlEnqueueBodySchema } from '@/lib/trend-intelligence/schemas/api';
import {
  enqueueDefaultCategoryCrawls,
  enqueueSeedCategoryCrawl,
} from '@/lib/trend-intelligence/workers/crawl-tick';

function assertWorkerSecret(secret: string) {
  const expected = process.env.CRAWL_WORKER_SECRET;
  if (!expected || secret !== expected) {
    return apiError('Unauthorized', 401);
  }
  return null;
}

/** POST /api/tiktok/internal/crawl/enqueue — crawl:product-rank from seed files */
export async function POST(request: Request) {
  try {
    const body = CrawlEnqueueBodySchema.parse(await request.json());
    const authError = assertWorkerSecret(body.secret);
    if (authError) return authError;

    if (body.categorySlug === '*') {
      const result = await enqueueDefaultCategoryCrawls();
      return NextResponse.json({ region: 'VN', ...result });
    }

    const job = await enqueueSeedCategoryCrawl({
      categorySlug: body.categorySlug,
    });

    return NextResponse.json({
      region: 'VN',
      enqueued: 1,
      jobs: [{ id: job.id, category: job.category, productCount: job.productCount }],
    });
  } catch (err) {
    return handleApiError(err);
  }
}
