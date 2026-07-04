/**
 * Cache abstraction — bắt đầu với in-memory, swap sang Redis/Upstash khi cần.
 * Hook: set REDIS_URL hoặc UPSTASH_REDIS_REST_URL để enable Redis sau.
 */

type CacheEntry<T> = { value: T; expiresAt: number };

const memoryStore = new Map<string, CacheEntry<unknown>>();

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  // TODO: if (process.env.REDIS_URL) return redisGet(key)
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet<T>(key: string, value: T | null, ttlSeconds: number): Promise<void> {
  if (value === null || ttlSeconds <= 0) {
    memoryStore.delete(key);
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  memoryStore.delete(key);
}
