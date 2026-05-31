# Rate Limiting Middleware

## Overview

The rate limiting middleware protects API endpoints from abuse by limiting the number of requests from a single client within a specified time window. It uses IP addresses or session IDs to track requests and enforces different rate limits based on endpoint sensitivity.

## Features

- **Three-tier rate limiting**: Strict, Normal, and Lenient limits
- **Flexible tracking**: Supports both IP-based and session-based tracking
- **Session preference**: Prefers session ID over IP address for authenticated users
- **Standard headers**: Returns RFC 6585 compliant rate limit headers
- **Detailed error responses**: Includes retry information and reset time
- **In-memory storage**: Efficient tracking with automatic cleanup
- **Monitoring**: Built-in statistics and reset capabilities

## Rate Limit Tiers

### Strict Rate Limit (10 requests/minute)

Use for sensitive endpoints that create, delete, or modify critical resources:

- `POST /api/events/create` - Create new event
- `DELETE /api/events/[id]` - Delete event
- `POST /api/events/[id]/professions/configure` - Configure professions
- `POST /api/professions/upload-image` - Upload profession image

**Rationale**: These operations modify state and interact with external services (Google Drive). They should be protected from abuse.

### Normal Rate Limit (100 requests/minute)

Use for standard endpoints that read or update data:

- `GET /api/events` - List events
- `PUT /api/events/[id]` - Update event
- `POST /api/selections/record` - Record visitor selection
- `GET /api/events/[id]/selections` - Get event selections
- `GET /api/events/[id]/selections/export` - Export selections

**Rationale**: These operations are used by authenticated users and should handle moderate traffic.

### Lenient Rate Limit (1000 requests/minute)

Use for public endpoints accessed by many visitors:

- `GET /api/events/[id]/professions` - Get professions for event
- `GET /api/events/[id]/wheel` - Get wheel data
- `GET /api/sessions/[sessionId]` - Get session info
- `POST /api/sessions/create` - Create visitor session

**Rationale**: These endpoints are accessed by visitors (not authenticated) and should handle high traffic.

## Usage

### Basic Usage

```typescript
import { strictRateLimit, normalRateLimit, lenientRateLimit } from "@/middleware/rateLimiter";
import { withErrorHandler } from "@/middleware/errorHandler";
import { withAuth } from "@/middleware/auth";

// Strict rate limit for sensitive endpoint
export default strictRateLimit(async (req, res) => {
  // Handler logic
});

// Normal rate limit for standard endpoint
export default normalRateLimit(async (req, res) => {
  // Handler logic
});

// Lenient rate limit for public endpoint
export default lenientRateLimit(async (req, res) => {
  // Handler logic
});
```

### With Multiple Middleware

```typescript
import { withMiddleware } from "@/middleware/errorHandler";

export default withMiddleware(
  handler,
  withErrorHandler,
  withAuth,
  strictRateLimit
);
```

### Custom Rate Limit Configuration

```typescript
import { createRateLimiter } from "@/middleware/rateLimiter";

const customConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,     // 50 requests per minute
};

export default createRateLimiter(customConfig)(async (req, res) => {
  // Handler logic
});
```

## Client Identification

The middleware identifies clients using the following priority:

1. **Session ID** (if available)
   - Extracted from `next-auth.session-token` cookie
   - Or from `x-session-id` header
   - Tracked as `session:{sessionId}`

2. **IP Address** (fallback)
   - Extracted from `x-forwarded-for` header (Vercel, proxies)
   - Or from `socket.remoteAddress`
   - Tracked as `ip:{ipAddress}`

This ensures that authenticated users are tracked by session, while anonymous visitors are tracked by IP.

## Response Headers

When a request is successful, the following headers are included:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1622387400
```

- `X-RateLimit-Limit`: Maximum requests allowed in the current window
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets

When rate limited (429 response), additional headers are included:

```
Retry-After: 45
```

- `Retry-After`: Number of seconds to wait before retrying

## Error Response

When a client exceeds the rate limit, a 429 Too Many Requests response is returned:

```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 45,
    "resetTime": "2024-05-30T22:05:00.000Z"
  }
}
```

## Implementation Details

### Request Tracking

Requests are tracked using timestamps stored in memory:

```typescript
interface RequestTracker {
  timestamps: number[];      // Array of request timestamps
  lastCleanup: number;       // Last cleanup timestamp
}
```

### Cleanup Strategy

Old entries are automatically cleaned up:

- Cleanup runs every 5 minutes
- Entries older than the rate limit window are removed
- Empty entries are deleted from the store

### Time Window

The rate limit window is a sliding window:

- Each request is timestamped
- Requests older than `windowMs` are ignored
- The limit is checked against requests within the current window

## Monitoring

### Get Statistics

```typescript
import { getRateLimitStats } from "@/middleware/rateLimiter";

const stats = getRateLimitStats();
console.log(stats);
// {
//   totalTrackedIdentifiers: 42,
//   identifiers: [
//     {
//       identifier: "ip:192.168.1.1",
//       requestCount: 5,
//       oldestRequest: "2024-05-30T22:00:00.000Z"
//     },
//     ...
//   ]
// }
```

### Reset Rate Limit

```typescript
import { resetRateLimit } from "@/middleware/rateLimiter";

// Reset for a specific identifier
resetRateLimit("ip:192.168.1.1");
```

### Clear All Rate Limits

```typescript
import { clearAllRateLimits } from "@/middleware/rateLimiter";

// Clear all tracking data
clearAllRateLimits();
```

## Best Practices

### 1. Choose the Right Tier

- Use **Strict** for operations that modify state or interact with external services
- Use **Normal** for standard CRUD operations
- Use **Lenient** for public endpoints accessed by many users

### 2. Combine with Authentication

```typescript
export default withMiddleware(
  handler,
  withErrorHandler,
  withAuth,           // Authenticate first
  strictRateLimit     // Then rate limit
);
```

### 3. Handle Rate Limit Errors

On the client side, handle 429 responses:

```typescript
try {
  const response = await fetch("/api/events/create", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (response.status === 429) {
    const error = await response.json();
    const retryAfter = error.details.retryAfter;
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    
    // Wait and retry
    setTimeout(() => {
      // Retry request
    }, retryAfter * 1000);
  }
} catch (error) {
  console.error("Request failed:", error);
}
```

### 4. Monitor Rate Limit Usage

Periodically check rate limit statistics:

```typescript
// In a monitoring endpoint (admin only)
export default async (req, res) => {
  const stats = getRateLimitStats();
  res.json(stats);
};
```

### 5. Adjust Limits Based on Usage

Monitor the statistics and adjust limits if needed:

```typescript
// If many users are hitting the limit, increase it
const customConfig = {
  windowMs: 60 * 1000,
  maxRequests: 150,  // Increased from 100
};
```

## Testing

### Unit Tests

The middleware includes comprehensive unit tests:

```bash
npm test -- src/middleware/rateLimiter.test.ts
```

Tests cover:

- Request limiting within the limit
- Request rejection when exceeding the limit
- Rate limit headers
- IP-based tracking
- Session-based tracking
- Custom configurations
- Error response format
- Session ID preference

### Manual Testing

Test rate limiting manually:

```bash
# Make 11 requests to a strict rate limit endpoint
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/events/create \
    -H "Content-Type: application/json" \
    -d '{"name":"Event","description":"Test"}'
  echo "Request $i"
done
```

The 11th request should return 429 Too Many Requests.

## Performance Considerations

### Memory Usage

- Each tracked identifier stores an array of timestamps
- Cleanup runs every 5 minutes to remove old entries
- Typical memory usage: ~1KB per active identifier

### CPU Usage

- Timestamp comparison is O(n) where n = requests in window
- For 10 requests/min: ~10 comparisons per request
- Negligible performance impact

### Scalability

For multi-instance deployments (multiple Vercel instances):

- Current implementation uses in-memory storage
- Each instance tracks independently
- For distributed rate limiting, consider:
  - Redis-based tracking
  - Shared rate limit service
  - API Gateway rate limiting (Vercel Edge Middleware)

## Troubleshooting

### Rate Limit Too Strict

If legitimate users are hitting the limit:

1. Check the rate limit tier
2. Verify the time window (should be 60 seconds)
3. Consider increasing the limit
4. Check for bot traffic

### Rate Limit Not Working

If rate limiting isn't enforced:

1. Verify the middleware is applied to the endpoint
2. Check that the handler is wrapped correctly
3. Verify the rate limit configuration
4. Check logs for errors

### Incorrect Client Identification

If different clients are tracked as the same:

1. Verify IP address extraction (check `x-forwarded-for` header)
2. Verify session ID extraction (check cookie name)
3. Check for proxy/load balancer configuration

## Future Improvements

1. **Redis-based tracking**: For distributed rate limiting
2. **Dynamic limits**: Adjust limits based on server load
3. **User-based limits**: Different limits for different user types
4. **Endpoint-specific limits**: Configure limits per endpoint
5. **Rate limit bypass**: Allow certain IPs/users to bypass limits
6. **Metrics export**: Export metrics to monitoring services

## References

- [RFC 6585 - HTTP Status Code 429](https://tools.ietf.org/html/rfc6585)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [OWASP - Denial of Service](https://owasp.org/www-community/attacks/Denial_of_Service)
