import { NextResponse } from 'next/server';
import { z } from 'zod';

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof z.ZodError) {
    return apiError('Invalid payload', 400, err.issues);
  }
  const message = err instanceof Error ? err.message : 'Internal error';
  return apiError(message, 500);
}
