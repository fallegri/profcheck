import { NextApiRequest, NextApiResponse } from "next";
import { logger } from "@/utils/logger";

/**
 * Options for configuring rate limiting behavior
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. Default: 100 */
  maxRequests?: number;
  /** Time window in milliseconds. Default: 60000 (1 minute) */
  windowMs?: number;
  /** Function to generate a unique key per client. Default: IP address */
  keyGenerator?: (req: NextApiRequest) => string;
}

/**
 * Internal record tracking request timestamps for a given key
 */
interface RateLimitRecord {
  /** Timestamps (ms) of requests within the current window */
  timestamps: number[];
  /** Timestamp of the last cleanup for this record */
  lastCleanup: number;
}

/**
 * In-memory store for rate limit records.
 * Key: client identifier (e.g. IP address)
 * Value: sliding-window record
 */
const store = new Map<string, RateLimitRecord>();

/**
 * Interval handle for the periodic cleanup task.
 * Exported for testing purposes only.
 */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic cleanup task that removes expired entries from the store.
 * Called automatically on first use; safe to call multiple times.
 *
 * @param windowMs - Entries older than this value (ms) are considered expired
 */
export function startCleanup(windowMs: number = 60_000): void {
  if (cleanupInterval !== null) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      // Remove timestamps outside the window
      record.timestamps = record.timestamps.filter(
        (ts) => now - ts < windowMs
      );
      // Delete the entry entirely if it has no recent requests
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
    logger.debug("Rate limit store cleanup completed", {
      remainingEntries: store.size,
    });
  }, windowMs);

  // Allow the Node.js process to exit even if this interval is still active
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Stop the periodic cleanup task.
 * Useful in tests to avoid open handles.
 */
export function stopCleanup(): void {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Clear all rate limit records from the in-memory store.
 * Useful in tests to reset state between test cases.
 */
export function clearStore(): void {
  store.clear();
}

/**
 * Extract the client IP address from a Next.js API request.
 * Respects the X-Forwarded-For header set by proxies / Vercel.
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

/**
 * Check whether a request from `key` is within the allowed rate limit.
 *
 * Uses a sliding-window algorithm:
 * - Keeps a list of request timestamps for each key.
 * - On each request, prunes timestamps older than `windowMs`.
 * - If the remaining count is below `maxRequests`, the request is allowed and
 *   the current timestamp is appended.
 * - Otherwise the request is rejected.
 *
 * @returns An object describing whether the request is allowed and the current
 *          request count / limit metadata.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): {
  allowed: boolean;
  remaining: number;
  resetAfterMs: number;
  retryAfterMs: number;
} {
  const now = Date.now();

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [], lastCleanup: now };
    store.set(key, record);
  }

  // Slide the window: remove timestamps that have expired
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  const count = record.timestamps.length;

  if (count >= maxRequests) {
    // Oldest timestamp in the window determines when the window resets
    const oldestTs = record.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestTs);

    logger.warn("Rate limit exceeded", {
      key,
      count,
      maxRequests,
      retryAfterMs,
    });

    return {
      allowed: false,
      remaining: 0,
      resetAfterMs: retryAfterMs,
      retryAfterMs,
    };
  }

  // Allow the request and record its timestamp
  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    resetAfterMs: windowMs,
    retryAfterMs: 0,
  };
}

/**
 * Higher-order function that wraps a Next.js API route handler with rate
 * limiting using a sliding-window algorithm backed by an in-memory Map.
 *
 * When the limit is exceeded the handler is NOT called and a 429 Too Many
 * Requests response is returned with a `Retry-After` header (in seconds).
 *
 * @example
 * ```ts
 * export default withRateLimit({ maxRequests: 10, windowMs: 60_000 })(
 *   async (req, res) => { res.json({ ok: true }); }
 * );
 * ```
 *
 * @example Strict limit for critical endpoints
 * ```ts
 * export default withRateLimit({ maxRequests: 5, windowMs: 60_000 })(handler);
 * ```
 */
export function withRateLimit(options: RateLimitOptions = {}) {
  const maxRequests = options.maxRequests ?? 100;
  const windowMs = options.windowMs ?? 60_000;
  const keyGenerator = options.keyGenerator ?? getClientIp;

  // Ensure the cleanup task is running
  startCleanup(windowMs);

  return function rateLimitMiddleware(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return async function rateLimitedHandler(
      req: NextApiRequest,
      res: NextApiResponse
    ): Promise<void> {
      const key = keyGenerator(req);
      const result = checkRateLimit(key, maxRequests, windowMs);

      // Always set informational headers
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", result.remaining);

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
        res.setHeader("Retry-After", retryAfterSeconds);

        res.status(429).json({
          success: false,
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: retryAfterSeconds,
        });
        return;
      }

      await handler(req, res);
    };
  };
}

/**
 * Pre-configured rate limiter for critical authentication endpoints.
 * Applies a stricter limit: 20 requests per minute per IP.
 *
 * Usage:
 * ```ts
 * export default authRateLimit(handler);
 * ```
 */
export const authRateLimit = withRateLimit({
  maxRequests: 20,
  windowMs: 60_000,
});

/**
 * Pre-configured rate limiter for the selections record endpoint.
 * Applies a stricter limit: 30 requests per minute per IP.
 *
 * Usage:
 * ```ts
 * export default selectionsRateLimit(handler);
 * ```
 */
export const selectionsRateLimit = withRateLimit({
  maxRequests: 30,
  windowMs: 60_000,
});
