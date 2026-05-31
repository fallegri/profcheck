import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { createApiError } from '@/middleware/errorHandler';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventProfession: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    visitorSelection: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));
// Pass-through mocks so middleware wrapping doesn't interfere
jest.mock('@/middleware/errorHandler', () => ({
  withErrorHandler: (handler: any) => handler,
  createApiError: jest.fn((message: string, status: number, code?: string) => {
    const error = new Error(message) as any;
    error.statusCode = status;
    error.code = code;
    return error;
  }),
  handleApiError: jest.fn(),
}));
jest.mock('@/middleware/rateLimiter', () => ({
  strictRateLimit: (handler: any) => handler,
  normalRateLimit: (handler: any) => handler,
  withRateLimit: () => (handler: any) => handler,
  apiRateLimit: (handler: any) => handler,
  authRateLimit: (handler: any) => handler,
  selectionRateLimit: (handler: any) => handler,
}));
// Pass-through validation so tests focus on auth/ownership logic
jest.mock('@/middleware/validation', () => ({
  validateMethod: jest.fn(),
  validateBody: jest.fn((req: any) => req.body),
  validateQuery: jest.fn((req: any) => req.query),
}));
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Admin Routes Protection', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      method: 'GET',
      url: '/api/events/123',
      headers: {},
      query: { id: '123' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe('Event Update Endpoint Protection', () => {
    it('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      // Import the handler
      const { default: handler } = await import('@/pages/api/events/[id]/update');

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();
    });

    it('should reject requests from non-event-owner', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-456', name: 'Event' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import('@/pages/api/events/[id]/update');

      mockReq.method = 'PUT';
      mockReq.body = { name: 'Updated Event' };

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow('Forbidden');
    });

    it('should allow event owner to update event', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-123', name: 'Event' };
      const updatedEvent = { ...mockEvent, name: 'Updated Event' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.event.update as jest.Mock).mockResolvedValue(updatedEvent);

      const { default: handler } = await import('@/pages/api/events/[id]/update');

      mockReq.method = 'PUT';
      mockReq.query = { id: 'event-123' };
      mockReq.body = { name: 'Updated Event' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-123' },
        })
      );
    });
  });

  describe('Event Delete Endpoint Protection', () => {
    it('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import('@/pages/api/events/[id]/delete');

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();
    });

    it('should reject requests from non-event-owner', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-456' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import('@/pages/api/events/[id]/delete');

      mockReq.method = 'DELETE';

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow('Forbidden');
    });

    it('should allow event owner to delete event', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-123' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.event.delete as jest.Mock).mockResolvedValue(mockEvent);

      const { default: handler } = await import('@/pages/api/events/[id]/delete');

      mockReq.method = 'DELETE';
      mockReq.query = { id: 'event-123' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(prisma.event.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-123' },
        })
      );
    });
  });

  describe('Profession Configuration Endpoint Protection', () => {
    it('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import(
        '@/pages/api/events/[id]/professions/configure'
      );

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();
    });

    it('should reject requests from non-event-owner', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-456' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import(
        '@/pages/api/events/[id]/professions/configure'
      );

      mockReq.method = 'POST';
      mockReq.query = { id: 'event-123' };
      mockReq.body = { professions: [{ professionId: 'clh1234567890abcdefghijk', order: 1 }] };

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow('Forbidden');
    });

    it('should allow event owner to configure professions', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-123' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.eventProfession.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.eventProfession.create as jest.Mock).mockResolvedValue({
        profession: { id: 'prof-1', name: 'Engineer' },
        order: 1,
      });

      const { default: handler } = await import(
        '@/pages/api/events/[id]/professions/configure'
      );

      mockReq.method = 'POST';
      mockReq.query = { id: 'event-123' };
      mockReq.body = {
        professions: [{ professionId: 'clh1234567890abcdefghijk', order: 1 }],
      };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(prisma.eventProfession.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'event-123' },
        })
      );
    });
  });

  describe('Selections Export Endpoint Protection', () => {
    it('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import(
        '@/pages/api/events/[id]/selections/export'
      );

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();
    });

    it('should reject requests from non-event-owner', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-456' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import(
        '@/pages/api/events/[id]/selections/export'
      );

      mockReq.method = 'GET';

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow('Forbidden');
    });

    it('should allow event owner to export selections', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-123' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.visitorSelection.findMany as jest.Mock).mockResolvedValue([]);

      const { default: handler } = await import(
        '@/pages/api/events/[id]/selections/export'
      );

      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8'
      );
    });
  });

  describe('Selections List Endpoint Protection', () => {
    it('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import(
        '@/pages/api/events/[id]/selections/index'
      );

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();
    });

    it('should reject requests from non-event-owner', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-456' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const { default: handler } = await import(
        '@/pages/api/events/[id]/selections/index'
      );

      mockReq.method = 'GET';

      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow('Forbidden');
    });

    it('should allow event owner to list selections', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockEvent = { id: 'event-123', adminId: 'user-123' };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.visitorSelection.count as jest.Mock).mockResolvedValue(0);
      (prisma.visitorSelection.findMany as jest.Mock).mockResolvedValue([]);

      const { default: handler } = await import(
        '@/pages/api/events/[id]/selections/index'
      );

      mockReq.method = 'GET';
      mockReq.query = { id: 'event-123', limit: '10', offset: '0' };

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(prisma.visitorSelection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'event-123' },
        })
      );
    });
  });
});
