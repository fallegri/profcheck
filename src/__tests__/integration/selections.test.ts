/**
 * Integration tests: Visitor Selections
 *
 * Tests the selections API endpoint:
 * - POST /api/selections/record validates required fields
 * - POST /api/selections/record returns 400 with invalid data
 * - POST /api/selections/record returns 201 with valid data
 *
 * Requirements: 6.0
 */

import { NextApiRequest, NextApiResponse } from 'next';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: jest.fn(),
    },
    eventProfession: {
      findUnique: jest.fn(),
    },
    visitorSession: {
      findUnique: jest.fn(),
    },
    visitorSelection: {
      create: jest.fn(),
    },
  },
}));
jest.mock('@/middleware/rateLimiter', () => ({
  normalRateLimit: (handler: any) => handler,
  strictRateLimit: (handler: any) => handler,
  lenientRateLimit: (handler: any) => handler,
}));
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockReq(overrides: Partial<NextApiRequest> = {}): Partial<NextApiRequest> {
  return {
    method: 'POST',
    url: '/api/selections/record',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    query: {},
    body: {},
    socket: { remoteAddress: '127.0.0.1' } as any,
    ...overrides,
  };
}

function makeMockRes(): Partial<NextApiResponse> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

// Valid CUID-like IDs that satisfy the schema regex /^c[^\s-]*$/
const VALID_EVENT_ID = 'cld1234567890abcdef';
const VALID_PROFESSION_ID = 'cld9876543210fedcba';
// Session ID: alphanumeric and hyphens only /^[a-zA-Z0-9_-]+$/
const VALID_SESSION_ID = 'session-abc-123';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Selections Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Input validation ─────────────────────────────────────────────────────

  describe('POST /api/selections/record — input validation', () => {
    it('returns 400 when body is empty', async () => {
      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({ body: {} });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('returns 400 when eventId is missing', async () => {
      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          professionId: VALID_PROFESSION_ID,
          sessionId: VALID_SESSION_ID,
          // eventId missing
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when professionId is missing', async () => {
      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          sessionId: VALID_SESSION_ID,
          // professionId missing
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when sessionId is missing', async () => {
      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          professionId: VALID_PROFESSION_ID,
          // sessionId missing
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when eventId has invalid format', async () => {
      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: 'not-a-valid-cuid', // starts with 'n', not 'c'
          professionId: VALID_PROFESSION_ID,
          sessionId: VALID_SESSION_ID,
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when sessionId contains invalid characters', async () => {
      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          professionId: VALID_PROFESSION_ID,
          sessionId: 'session with spaces!', // spaces and ! are invalid
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 405 for non-POST methods', async () => {
      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(405);
    });
  });

  // ── Business logic ───────────────────────────────────────────────────────

  describe('POST /api/selections/record — business logic', () => {
    it('returns 404 when event does not exist', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          professionId: VALID_PROFESSION_ID,
          sessionId: VALID_SESSION_ID,
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when profession is not configured for the event', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_EVENT_ID,
        name: 'Test Event',
      });
      (prisma.eventProfession.findUnique as jest.Mock).mockResolvedValue(null);

      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          professionId: VALID_PROFESSION_ID,
          sessionId: VALID_SESSION_ID,
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when session does not exist', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_EVENT_ID,
        name: 'Test Event',
      });
      (prisma.eventProfession.findUnique as jest.Mock).mockResolvedValue({
        eventId: VALID_EVENT_ID,
        professionId: VALID_PROFESSION_ID,
      });
      (prisma.visitorSession.findUnique as jest.Mock).mockResolvedValue(null);

      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          professionId: VALID_PROFESSION_ID,
          sessionId: VALID_SESSION_ID,
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when session belongs to a different event', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_EVENT_ID,
        name: 'Test Event',
      });
      (prisma.eventProfession.findUnique as jest.Mock).mockResolvedValue({
        eventId: VALID_EVENT_ID,
        professionId: VALID_PROFESSION_ID,
      });
      (prisma.visitorSession.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_SESSION_ID,
        eventId: 'cdifferenteventid123', // different event
      });

      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          professionId: VALID_PROFESSION_ID,
          sessionId: VALID_SESSION_ID,
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.code).toBe('INVALID_SESSION');
    });

    it('returns 201 when all data is valid and consistent', async () => {
      const { prisma } = require('@/lib/prisma');
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_EVENT_ID,
        name: 'Test Event',
      });
      (prisma.eventProfession.findUnique as jest.Mock).mockResolvedValue({
        eventId: VALID_EVENT_ID,
        professionId: VALID_PROFESSION_ID,
      });
      (prisma.visitorSession.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_SESSION_ID,
        eventId: VALID_EVENT_ID, // same event
      });
      (prisma.visitorSelection.create as jest.Mock).mockResolvedValue({
        id: 'cselection123456789',
        eventId: VALID_EVENT_ID,
        professionId: VALID_PROFESSION_ID,
        sessionId: VALID_SESSION_ID,
        timestamp: new Date(),
      });

      const { default: handler } = await import('@/pages/api/selections/record');
      const req = makeMockReq({
        body: {
          eventId: VALID_EVENT_ID,
          professionId: VALID_PROFESSION_ID,
          sessionId: VALID_SESSION_ID,
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 'cselection123456789' }),
        })
      );
    });
  });
});
