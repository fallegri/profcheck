import { NextApiRequest, NextApiResponse } from "next";
import { createApiError } from "./errorHandler";
import { logger } from "@/utils/logger";

/**
 * Rate limit configuration
 * Defines different rate limit tiers for different endpoint types
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds (default: 60000)
  maxRequests: number; // Maximum requests per window (default: 100)
  message?: string; // Custom error message
  keyGenerator?: (req: NextApiRequest) => string; // Custom key generator (default: IP-based)
}

/**
 * Options for withRateLimit factory function
 */
export interface RateLimitOptions {
  maxRequests?: number; // Maximum requests per window (default: 100)
  windowMs?: number; // Time window in milliseconds (default: 60000)
  keyGenerator?: (req: NextApiRequest) => string; // Custom key generator (default: IP-based)
  message?: string; // Custom error message
}

/**
 * Request tracking data
 * Stores timestamp of each request for a given identifier
 */
interface RequestTracker {
  timestamps: number[];
  lastCleanup: number;
}

/**
 * In-memory store for tracking requests
 * Key: identifier (IP or session ID)
 * Value: RequestTracker with timestamps
 */
const requestStore = new Map<string, RequestTracker>();

/**
 * Cleanup interval for removing old entries (5 minutes)
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Get client identifier (IP address or session ID)
 * Prefers session ID if available, falls back to IP address
 */
function getClientIdentifier(req: NextApiRequest): string {
  // Try to get session ID from cookies or headers
  const sessionId = req.cookies?.["next-auth.session-token"] ||
    req.headers["x-session-id"] as string;

  if (sessionId) {
    return `session:${sessionId}`;
  }

  // Fall back to IP address
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }

  return `ip:${req.socket?.remoteAddress || "unknown"}`;
}

/**
 * Default key generator using IP address
 * Used when no custom keyGenerator is provided
 */
export function defaultKeyGenerator(req: NextApiRequest): string {
  return getClientIdentifier(req);
}

/**
 * Clean up old entries from the request store
 * Removes entries older than the window size
 */
function cleanupOldEntries(windowMs: number): void {
  const now = Date.now();
  const cutoffTime = now - windowMs;

  for (const [identifier, tracker] of requestStore.entries()) {
    // Remove timestamps older than the window
    tracker.timestamps = tracker.timestamps.filter(
      (timestamp) => timestamp > cutoffTime
    );

    // Remove the entry if no timestamps remain
    if (tracker.timestamps.length === 0) {
      requestStore.delete(identifier);
    }
  }
}

/**
 * Check if a request should be rate limited
 * Returns true if the request exceeds the rate limit
 */
function isRateLimited(
  identifier: string,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create tracker for this identifier
  let tracker = requestStore.get(identifier);
  if (!tracker) {
    tracker = {
      timestamps: [],
      lastCleanup: now,
    };
    requestStore.set(identifier, tracker);
  }

  // Periodically clean up old entries
  if (now - tracker.lastCleanup > CLEANUP_INTERVAL) {
    cleanupOldEntries(config.windowMs);
    tracker.lastCleanup = now;
  }

  // Remove timestamps outside the current window
  tracker.timestamps = tracker.timestamps.filter(
    (timestamp) => timestamp > windowStart
  );

  // Check if limit exceeded
  if (tracker.timestamps.length >= config.maxRequests) {
    return true;
  }

  // Add current request timestamp
  tracker.timestamps.push(now);
  return false;
}

/**
 * Get remaining requests for an identifier
 * Useful for returning rate limit info in response headers
 */
function getRemainingRequests(
  identifier: string,
  config: RateLimitConfig
): number {
  const tracker = requestStore.get(identifier);
  if (!tracker) {
    return config.maxRequests;
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;

  const validTimestamps = tracker.timestamps.filter(
    (timestamp) => timestamp > windowStart
  );

  return Math.max(0, config.maxRequests - validTimestamps.length);
}

/**
 * Get reset time (when the rate limit window resets)
 * Returns milliseconds until the oldest request expires
 */
function getResetTime(
  identifier: string,
  config: RateLimitConfig
): number {
  const tracker = requestStore.get(identifier);
  if (!tracker || tracker.timestamps.length === 0) {
    return 0;
  }

  const oldestTimestamp = Math.min(...tracker.timestamps);
  const resetTime = oldestTimestamp + config.windowMs;
  return Math.max(0, resetTime - Date.now());
}

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // Strict: 20 requests per minute for critical endpoints (upload, record selection)
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  } as RateLimitConfig,

  // Normal/Default: 100 requests per minute for standard endpoints (read, update)
  normal: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  } as RateLimitConfig,

  // Lenient: 1000 requests per minute for public endpoints (get professions, wheel)
  lenient: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
  } as RateLimitConfig,
};

/**
 * Middleware factory for rate limiting
 * Returns a middleware function that enforces rate limits
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const keyGen = config.keyGenerator || getClientIdentifier;
      const identifier = keyGen(req);

      // Check if rate limited
      if (isRateLimited(identifier, config)) {
        const remaining = getRemainingRequests(identifier, config);
        const resetTime = getResetTime(identifier, config);

        logger.warn("Rate limit exceeded", {
          identifier,
          method: req.method,
          url: req.url,
          resetTimeMs: resetTime,
        });

        // Set rate limit headers
        res.setHeader("X-RateLimit-Limit", config.maxRequests.toString());
        res.setHeader("X-RateLimit-Remaining", remaining.toString());
        res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString());
        res.setHeader("Retry-After", Math.ceil(resetTime / 1000).toString());

        throw createApiError(
          "Too many requests, please try again later",
          429,
          "RATE_LIMIT_EXCEEDED",
          {
            retryAfter: Math.ceil(resetTime / 1000),
            resetTime: new Date(Date.now() + resetTime).toISOString(),
          }
        );
      }

      // Set rate limit headers for successful requests
      const remaining = getRemainingRequests(identifier, config);
      const resetTime = getResetTime(identifier, config);

      res.setHeader("X-RateLimit-Limit", config.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString());

      // Call the handler
      return handler(req, res);
    };
  };
}

/**
 * Higher-order function that wraps a Next.js API route handler with rate limiting.
 * This is the primary factory function for creating rate-limited handlers.
 *
 * @param options - Rate limit options (maxRequests, windowMs, keyGenerator)
 * @returns A function that wraps a handler with rate limiting
 *
 * @example
 * export default withRateLimit({ maxRequests: 50, windowMs: 60000 })(handler);
 */
export function withRateLimit(options: RateLimitOptions = {}) {
  const config: RateLimitConfig = {
    maxRequests: options.maxRequests ?? 100,
    windowMs: options.windowMs ?? 60 * 1000,
    message: options.message,
    keyGenerator: options.keyGenerator,
  };
  return createRateLimiter(config);
}

/**
 * Strict rate limiter: 20 requests/minute
 * Use for critical endpoints (upload-image, record selection)
 */
export function strictRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return createRateLimiter(RATE_LIMITS.strict)(handler);
}

/**
 * Default rate limiter: 100 requests/minute
 * Use for standard endpoints (read, update)
 * Alias for normalRateLimit
 */
export function defaultRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return createRateLimiter(RATE_LIMITS.normal)(handler);
}

/**
 * Normal rate limiter: 100 requests/minute
 * Use for standard endpoints (read, update)
 */
export function normalRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return createRateLimiter(RATE_LIMITS.normal)(handler);
}

/**
 * Lenient rate limiter: 1000 requests/minute
 * Use for public endpoints (get professions, wheel)
 */
export function lenientRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return createRateLimiter(RATE_LIMITS.lenient)(handler);
}

/**
 * Get rate limit statistics for monitoring
 * Returns current state of rate limiting
 */
export function getRateLimitStats() {
  const stats = {
    totalTrackedIdentifiers: requestStore.size,
    identifiers: [] as Array<{
      identifier: string;
      requestCount: number;
      oldestRequest: string | null;
    }>,
  };

  for (const [identifier, tracker] of requestStore.entries()) {
    const oldestTimestamp = tracker.timestamps.length > 0
      ? Math.min(...tracker.timestamps)
      : null;

    stats.identifiers.push({
      identifier,
      requestCount: tracker.timestamps.length,
      oldestRequest: oldestTimestamp
        ? new Date(oldestTimestamp).toISOString()
        : null,
    });
  }

  return stats;
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or manual intervention
 */
export function resetRateLimit(identifier: string): void {
  requestStore.delete(identifier);
  logger.info("Rate limit reset", { identifier });
}

/**
 * Clear all rate limit data
 * Useful for testing or server restart
 */
export function clearAllRateLimits(): void {
  requestStore.clear();
  logger.info("All rate limits cleared");
}
