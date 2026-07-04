/** In-memory rate limit — swap Redis INCR khi scale */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const LIMIT = Number(process.env.TOOL_RATE_LIMIT_PER_HOUR ?? 20);
const WINDOW_MS = 60 * 60 * 1000;

export function checkRateLimit(visitorKey: string, toolKey: string) {
  const key = `${visitorKey}:${toolKey}`;
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > LIMIT) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: LIMIT - bucket.count,
  };
}
