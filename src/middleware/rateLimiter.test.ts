import { NextApiRequest, NextApiResponse } from "next";
import {
  strictRateLimit,
  normalRateLimit,
  lenientRateLimit,
  RATE_LIMITS,
  getRateLimitStats,
  resetRateLimit,
  clearAllRateLimits,
  createRateLimiter,
} from "./rateLimiter";

/**
 * Mock request and response objects
 */
function createMockRequest(overrides?: Partial<NextApiRequest>): NextApiRequest {
  return {
    method: "GET",
    url: "/api/test",
    headers: {
      "x-forwarded-for": "192.168.1.1",
    },
    socket: {
      remoteAddress: "127.0.0.1",
    } as any,
    cookies: {},
    ...overrides,
  } as NextApiRequest;
}

function createMockResponse(): NextApiResponse {
  const headers: Record<string, string> = {};
  return {
    setHeader: (key: string, value: string | number) => {
      headers[key] = String(value);
    },
    getHeader: (key: string) => headers[key],
    status: (code: number) => ({
      json: (data: any) => ({ statusCode: code, data }),
    }),
  } as any;
}

describe("Rate Limiter Middleware", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe("Strict Rate Limit (20/min)", () => {
    it("should allow requests within the limit", async () => {
      let callCount = 0;
      const handler = strictRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest();
      const res = createMockResponse();

      // Make 20 requests (should all succeed)
      for (let i = 0; i < 20; i++) {
        await handler(req, res);
      }

      expect(callCount).toBe(20);
    });

    it("should reject requests exceeding the limit", async () => {
      let callCount = 0;
      const handler = strictRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest();
      const res = createMockResponse();

      // Make 21 requests (21st should fail)
      for (let i = 0; i < 21; i++) {
        try {
          await handler(req, res);
        } catch (error: any) {
          expect(error.statusCode).toBe(429);
          expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
        }
      }

      expect(callCount).toBe(20);
    });

    it("should set rate limit headers", async () => {
      const handler = strictRateLimit(async (req, res) => {});

      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.getHeader("X-RateLimit-Limit")).toBe("20");
      expect(res.getHeader("X-RateLimit-Remaining")).toBe("19");
    });

    it("should track requests per IP address", async () => {
      let callCount = 0;
      const handler = strictRateLimit(async (req, res) => {
        callCount++;
      });

      const req1 = createMockRequest({
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      const req2 = createMockRequest({
        headers: { "x-forwarded-for": "192.168.1.2" },
      });
      const res = createMockResponse();

      // Make 20 requests from IP1 (should succeed)
      for (let i = 0; i < 20; i++) {
        await handler(req1, res);
      }

      // Make 1 request from IP2 (should succeed - different IP)
      await handler(req2, res);

      expect(callCount).toBe(21);
    });

    it("should track requests per session ID", async () => {
      let callCount = 0;
      const handler = strictRateLimit(async (req, res) => {
        callCount++;
      });

      const req1 = createMockRequest({
        cookies: { "next-auth.session-token": "session1" },
      });
      const req2 = createMockRequest({
        cookies: { "next-auth.session-token": "session2" },
      });
      const res = createMockResponse();

      // Make 20 requests from session1 (should succeed)
      for (let i = 0; i < 20; i++) {
        await handler(req1, res);
      }

      // Make 1 request from session2 (should succeed - different session)
      await handler(req2, res);

      expect(callCount).toBe(21);
    });
  });

  describe("Normal Rate Limit (100/min)", () => {
    it("should allow 100 requests within the limit", async () => {
      let callCount = 0;
      const handler = normalRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest();
      const res = createMockResponse();

      // Make 100 requests (should all succeed)
      for (let i = 0; i < 100; i++) {
        await handler(req, res);
      }

      expect(callCount).toBe(100);
    });

    it("should reject the 101st request", async () => {
      let callCount = 0;
      const handler = normalRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest();
      const res = createMockResponse();

      // Make 101 requests (101st should fail)
      for (let i = 0; i < 101; i++) {
        try {
          await handler(req, res);
        } catch (error: any) {
          if (error.statusCode === 429) {
            break;
          }
        }
      }

      expect(callCount).toBe(100);
    });
  });

  describe("Lenient Rate Limit (1000/min)", () => {
    it("should allow 1000 requests within the limit", async () => {
      let callCount = 0;
      const handler = lenientRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest();
      const res = createMockResponse();

      // Make 1000 requests (should all succeed)
      for (let i = 0; i < 1000; i++) {
        await handler(req, res);
      }

      expect(callCount).toBe(1000);
    });

    it("should reject the 1001st request", async () => {
      let callCount = 0;
      const handler = lenientRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest();
      const res = createMockResponse();

      // Make 1001 requests (1001st should fail)
      for (let i = 0; i < 1001; i++) {
        try {
          await handler(req, res);
        } catch (error: any) {
          if (error.statusCode === 429) {
            break;
          }
        }
      }

      expect(callCount).toBe(1000);
    });
  });

  describe("Rate Limit Headers", () => {
    it("should include Retry-After header when rate limited", async () => {
      const handler = strictRateLimit(async (req, res) => {});

      const req = createMockRequest();
      const res = createMockResponse();

      // Exceed the limit (21 requests, strict limit is 20)
      for (let i = 0; i < 21; i++) {
        try {
          await handler(req, res);
        } catch (error: any) {
          if (error.statusCode === 429) {
            expect(res.getHeader("Retry-After")).toBeDefined();
          }
        }
      }
    });

    it("should include X-RateLimit-Reset header", async () => {
      const handler = strictRateLimit(async (req, res) => {});

      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.getHeader("X-RateLimit-Reset")).toBeDefined();
    });
  });

  describe("Rate Limit Statistics", () => {
    it("should track rate limit statistics", async () => {
      const handler = strictRateLimit(async (req, res) => {});

      const req = createMockRequest();
      const res = createMockResponse();

      // Make some requests
      for (let i = 0; i < 5; i++) {
        await handler(req, res);
      }

      const stats = getRateLimitStats();
      expect(stats.totalTrackedIdentifiers).toBeGreaterThan(0);
      expect(stats.identifiers.length).toBeGreaterThan(0);
    });
  });

  describe("Rate Limit Reset", () => {
    it("should reset rate limit for a specific identifier", async () => {
      let callCount = 0;
      const handler = strictRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest({
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      const res = createMockResponse();

      // Make 10 requests (should succeed)
      for (let i = 0; i < 10; i++) {
        await handler(req, res);
      }

      // Reset the rate limit
      resetRateLimit("ip:192.168.1.1");

      // Make 1 more request (should succeed after reset)
      await handler(req, res);

      expect(callCount).toBe(11);
    });
  });

  describe("Custom Rate Limit Config", () => {
    it("should support custom rate limit configuration", async () => {
      let callCount = 0;
      const customConfig = {
        windowMs: 60 * 1000,
        maxRequests: 5,
      };

      const handler = createRateLimiter(customConfig)(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest();
      const res = createMockResponse();

      // Make 5 requests (should succeed)
      for (let i = 0; i < 5; i++) {
        await handler(req, res);
      }

      // 6th request should fail
      try {
        await handler(req, res);
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
      }

      expect(callCount).toBe(5);
    });
  });

  describe("Error Response Format", () => {
    it("should return proper error response when rate limited", async () => {
      const handler = strictRateLimit(async (req, res) => {});

      const req = createMockRequest();
      const res = createMockResponse();

      // Exceed the limit (21 requests, strict limit is 20)
      let errorThrown = false;
      for (let i = 0; i < 21; i++) {
        try {
          await handler(req, res);
        } catch (error: any) {
          if (error.statusCode === 429) {
            errorThrown = true;
            expect(error.message).toContain("Too many requests");
            expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
            expect(error.details).toBeDefined();
            expect(error.details.retryAfter).toBeDefined();
          }
        }
      }

      expect(errorThrown).toBe(true);
    });
  });

  describe("Session ID Preference", () => {
    it("should prefer session ID over IP address", async () => {
      let callCount = 0;
      const handler = strictRateLimit(async (req, res) => {
        callCount++;
      });

      const req = createMockRequest({
        headers: { "x-forwarded-for": "192.168.1.1" },
        cookies: { "next-auth.session-token": "session1" },
      });
      const res = createMockResponse();

      // Make 20 requests with session ID (should succeed, strict limit is 20)
      for (let i = 0; i < 20; i++) {
        await handler(req, res);
      }

      // 21st request should fail (tracked by session, not IP)
      try {
        await handler(req, res);
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
      }

      expect(callCount).toBe(20);
    });
  });
});
