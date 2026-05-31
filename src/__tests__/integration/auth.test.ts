/**
 * Integration tests: Authentication flow
 *
 * Tests that protected endpoints correctly enforce authentication:
 * - Return 401 when no session is present
 * - Return 200 (or appropriate success code) when a valid session is present
 *
 * Requirements: 1.0
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
      findMany: jest.fn(),
      create: jest.fn(),
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Protected endpoint: GET /api/events', () => {
    it('returns 401 when no session is present', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { default: handler } = await import('@/pages/api/events/index');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('returns 200 with valid session and existing user', async () => {
      const mockSession = {
        user: { email: 'admin@example.com', name: 'Admin' },
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'admin@example.com',
      });
      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

      const { default: handler } = await import('@/pages/api/events/index');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('returns 401 when session has no email', async () => {
      const mockSession = {
        user: { name: 'No Email User' }, // missing email
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { default: handler } = await import('@/pages/api/events/index');
      const req = makeMockReq({ method: 'GET' });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Protected endpoint: POST /api/events/create', () => {
    it('returns 401 when no session is present', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: { name: 'Test Event', description: 'A test event' },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 201 with valid session and valid body', async () => {
      const mockSession = {
        user: { email: 'admin@example.com', name: 'Admin' },
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { prisma } = require('@/lib/prisma');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'admin@example.com',
      });
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-abc',
        name: 'Test Event',
        description: 'A test event',
        adminId: 'user-123',
        createdAt: new Date(),
      });

      const { default: handler } = await import('@/pages/api/events/create');
      const req = makeMockReq({
        method: 'POST',
        body: { name: 'Test Event', description: 'A test event' },
      });
      const res = makeMockRes();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
