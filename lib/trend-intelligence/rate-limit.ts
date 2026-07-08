/** Simple in-memory rate limit for free-tier mutations (per process). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkMutationRateLimit(
  key: string,
  limitPerHour: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= limitPerHour) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
