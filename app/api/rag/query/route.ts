import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ContentType } from '@/lib/supabase/enums';
import { executeRagQuery } from '@/lib/rag/query';
import { checkRagRateLimit } from '@/lib/rag/rate-limit';
import { persistTrackEvent } from '@/lib/analytics/events';

const BodySchema = z.object({
  question: z.string().min(3).max(500),
  filters: z
    .object({
      contentTypes: z.array(z.nativeEnum(ContentType)).optional(),
      category: z.string().optional(),
    })
    .optional(),
  visitorId: z.string().optional(),
  sessionId: z.string().optional(),
  topK: z.number().min(1).max(10).optional(),
});

/**
 * POST /api/rag/query
 * RAG flow: embed → hybrid search → rerank → LLM → citations
 */
export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const visitorKey = body.visitorId ?? body.sessionId ?? request.headers.get('x-forwarded-for') ?? 'anon';

    const rate = checkRagRateLimit(visitorKey);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Rate limit. Retry in ${rate.retryAfterSec}s` },
        { status: 429 },
      );
    }

    const result = await executeRagQuery({
      question: body.question,
      filters: body.filters,
      visitorId: body.visitorId,
      sessionId: body.sessionId,
      topK: body.topK,
    });

    if (body.sessionId) {
      persistTrackEvent({
        eventType: 'search',
        sessionId: body.sessionId,
        visitorId: body.visitorId,
        metadata: {
          rag: true,
          question_length: body.question.length,
          sources_count: result.sources.length,
          fallback: result.fallback,
          retrieval_ms: result.retrievalMs,
        },
      }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'RAG query failed' }, { status: 500 });
  }
}
