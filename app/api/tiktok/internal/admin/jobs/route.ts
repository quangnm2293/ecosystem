import { NextResponse } from 'next/server';
import { handleApiError, apiError } from '@/lib/trend-intelligence/api/errors';
import {
  AdminJobsQuerySchema,
  AdminRequeueBodySchema,
} from '@/lib/trend-intelligence/schemas/api';
import { crawlRepository } from '@/lib/trend-intelligence/repositories/crawl.repository';
import { enqueueWatchlistRefresh } from '@/lib/trend-intelligence/workers/sources/crawl-watchlist-refresh';
import { evaluateAlerts } from '@/lib/trend-intelligence/workers/evaluate-alerts';

function assertAdminSecret(secret: string | null) {
  const expected = process.env.CRAWL_WORKER_SECRET;
  if (!expected || secret !== expected) {
    return apiError('Unauthorized', 401);
  }
  return null;
}

function serializeJob(j: Awaited<ReturnType<typeof crawlRepository.listRecent>>[number]) {
  return {
    id: j.id,
    source: j.source,
    status: j.status,
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    errorMessage: j.errorMessage,
    scheduledAt: j.scheduledAt.toISOString(),
    startedAt: j.startedAt?.toISOString() ?? null,
    completedAt: j.completedAt?.toISOString() ?? null,
    createdAt: j.createdAt.toISOString(),
    params: j.params,
  };
}

/** GET /api/tiktok/internal/admin/jobs?secret=&status=&limit= */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authError = assertAdminSecret(searchParams.get('secret'));
    if (authError) return authError;

    const query = AdminJobsQuerySchema.parse({
      status: searchParams.get('status') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    const [counts, jobs] = await Promise.all([
      crawlRepository.countByStatus(),
      crawlRepository.listRecent({ status: query.status, limit: query.limit ?? 50 }),
    ]);

    return NextResponse.json({ counts, jobs: jobs.map(serializeJob) });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/tiktok/internal/admin/jobs — requeue | watchlist-refresh | eval-alerts */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const authError = assertAdminSecret(typeof body.secret === 'string' ? body.secret : null);
    if (authError) return authError;

    const action = String(body.action ?? 'requeue');

    if (action === 'requeue') {
      const parsed = AdminRequeueBodySchema.parse(body);
      const job = await crawlRepository.requeue(parsed.jobId);
      if (!job) return apiError('Job not found or not FAILED/COMPLETED', 404);
      return NextResponse.json({ job: serializeJob(job) });
    }

    if (action === 'watchlist-refresh') {
      const enqueued = await enqueueWatchlistRefresh(
        typeof body.userId === 'string' ? body.userId : undefined,
      );
      return NextResponse.json({ enqueued });
    }

    if (action === 'eval-alerts') {
      const result = await evaluateAlerts(
        typeof body.limit === 'number' ? body.limit : 50,
      );
      return NextResponse.json(result);
    }

    return apiError('Unknown action', 400);
  } catch (err) {
    return handleApiError(err);
  }
}
