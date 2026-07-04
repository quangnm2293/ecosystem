const buckets = new Map<string, { count: number; resetAt: number }>();
const LIMIT = Number(process.env.RAG_RATE_LIMIT_PER_HOUR ?? 30);
const WINDOW_MS = 60 * 60 * 1000;

export function checkRagRateLimit(visitorKey: string) {
  const now = Date.now();
  let bucket = buckets.get(visitorKey);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(visitorKey, bucket);
  }

  bucket.count += 1;

  if (bucket.count > LIMIT) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}
