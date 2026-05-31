/**
 * Integration tests: Events CRUD
 *
 * Tests the events API endpoints:
 * - POST /api/events/create requires authentication
 * - GET /api/events requires authentication
 * - Input validation returns 400 with invalid data
 *
 * Requirements: 2.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    event: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
jest.mock('@/utils/encryptedData', () => ({
  decryptArray: (_arr: any[], _fn: any) => _arr,
  decryptEventData: (data: any) => data,
  encryptEventData: (data: any) => data,
}));
jest.mock('@/services/googleDrive', () => ({
  createEventFolder: jest.fn().mockResolvedValue(null),
  getFolderDetails: jest.fn().mockResolvedValue({ webViewLink: null }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockReq(overrides: Partial<NextApiRequest> = {}): Partial<NextApiRequest> {
  return {
    method: 'GET',
    url: '/api/events',
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

const validSession = {
  user: { email: 'admin@example.com', name: 'Admin' },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
};

const mockUser = { id: 'user-123', email: 'admin@example.com' };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Events Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /api/events/create ──────────────────────────────────────────────

  describe('POST /api/events/create', () => {
    it('requires authentication — returns 401 without session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: { name: 'My Event', description: 'Description' },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('returns 400 when name is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);
      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: { description: 'No name provided' }, // missing name
      });
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

    it('returns 400 when description is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);
      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: { name: 'Event Without Description' }, // missing description
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when name contains invalid characters', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);
      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: { name: '<script>alert(1)</script>', description: 'XSS attempt' },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when name exceeds 100 characters', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);
      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: {
          name: 'A'.repeat(101),
          description: 'Valid description',
        },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 201 with valid session and valid body', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);
      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-abc',
        name: 'My Event',
        description: 'A valid description',
        adminId: 'user-123',
        createdAt: new Date(),
      });

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: { name: 'My Event', description: 'A valid description' },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'event-abc', name: 'My Event' })
      );
    });

    it('returns 405 for non-POST methods', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(405);
    });
  });

  // ── GET /api/events ──────────────────────────────────────────────────────

  describe('GET /api/events', () => {
    it('requires authentication — returns 401 without session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { default: handler } = await import('@/pages/api/events/index');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 200 with empty list when user has no events', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);
      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

      const { default: handler } = await import('@/pages/api/events/index');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [] })
      );
    });

    it('returns 200 with list of events for authenticated user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);
      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'event-1',
          name: 'Event One',
          description: 'First event',
          createdAt: new Date(),
          updatedAt: new Date(),
          googleFolderId: null,
          googleFolderUrl: null,
        },
        {
          id: 'event-2',
          name: 'Event Two',
          description: 'Second event',
          createdAt: new Date(),
          updatedAt: new Date(),
          googleFolderId: null,
          googleFolderUrl: null,
        },
      ]);

      const { default: handler } = await import('@/pages/api/events/index');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data).toHaveLength(2);
    });

    it('returns 405 for non-GET methods', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(validSession);

      const { default: handler } = await import('@/pages/api/events/index');
      const req = makeMockReq({ method: 'POST' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(405);
    });
  });
});
