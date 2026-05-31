/**
 * Simple in-memory cache with TTL support.
 * Suitable for server-side caching of frequently-read, rarely-changing data.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Returns the cached value for `key` if it exists and has not expired.
 * Otherwise calls `fetchFn`, stores the result with the given TTL (in ms),
 * and returns it.
 *
 * @param key     - Unique cache key
 * @param ttl     - Time-to-live in milliseconds
 * @param fetchFn - Async function that produces the value when cache misses
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await fetchFn();
  store.set(key, { value, expiresAt: now + ttl });
  return value;
}

/**
 * Explicitly invalidates a cache entry.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Removes all expired entries from the store.
 * Call periodically to prevent unbounded memory growth.
 */
export function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

/** TTL constants (milliseconds) */
export const TTL = {
  FIVE_MINUTES: 5 * 60 * 1000,
  ONE_MINUTE: 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
} as const;
