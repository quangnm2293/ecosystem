import '@/lib/ai/adapters';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { executeTool } from '@/modules/ai-tools/engine/execute';

/** Veo 3 polling có thể mất vài phút (đặc biệt khi extend video). */
export const maxDuration = 600;

const BodySchema = z.object({
  toolKey: z.string(),
  input: z.record(z.string(), z.string()),
  visitorId: z.string().optional(),
  sessionId: z.string().min(1),
  contentId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const result = await executeTool(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed';
    const status = message.includes('Rate limit') ? 429 : message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
