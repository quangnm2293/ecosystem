import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runIngestJob } from '@/lib/rag/ingest';

const BodySchema = z.object({
  secret: z.string(),
  contentId: z.string().optional(),
});

/**
 * POST /api/rag/ingest
 * Webhook: re-index content after publish. Also callable from cron for full reindex.
 */
export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());

    if (body.secret !== process.env.RAG_INGEST_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runIngestJob(body.contentId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
