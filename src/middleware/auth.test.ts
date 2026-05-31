import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, verifyOwnership, verifyEventAdmin, withAuth } from './auth';
import { getServerSession } from 'next-auth';
import { createApiError } from './errorHandler';

// Mock dependencies
jest.mock('next-auth');
jest.mock('./errorHandler');
jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('requireAuth', () => {
    it('should return session if authenticated', async () => {
      const mockSession = {
        user: { email: 'user@example.com', name: 'Test User' },
        expires: new Date().toISOString(),
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireAuth(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );

      expect(result).toEqual(mockSession);
      expect(getServerSession).toHaveBeenCalled();
    });

    it('should throw 401 if session is null', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      await expect(
        requireAuth(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();
    });

    it('should throw 401 if user email is missing', async () => {
      const mockSession = {
        user: { name: 'Test User' }, // No email
        expires: new Date().toISOString(),
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      await expect(
        requireAuth(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();
    });

    it('should log unauthorized access attempts', async () => {
      const { logger } = require('@/utils/logger');
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      try {
        await requireAuth(mockReq as NextApiRequest, mockRes as NextApiResponse);
      } catch (e) {
        // Expected
      }

      expect(logger.warn).toHaveBeenCalledWith(
        'Unauthorized access attempt',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
        })
      );
    });
  });

  describe('verifyOwnership', () => {
    it('should pass if user owns resource', async () => {
      await expect(
        verifyOwnership('user-123', 'user-123')
      ).resolves.toBeUndefined();
    });

    it('should throw 403 if user does not own resource', async () => {
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      await expect(
        verifyOwnership('user-123', 'user-456')
      ).rejects.toThrow();
    });

    it('should log unauthorized resource access', async () => {
      const { logger } = require('@/utils/logger');
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      try {
        await verifyOwnership('user-123', 'user-456');
      } catch (e) {
        // Expected
      }

      expect(logger.warn).toHaveBeenCalledWith(
        'Unauthorized resource access',
        expect.objectContaining({
          userId: 'user-123',
          resourceOwnerId: 'user-456',
        })
      );
    });
  });

  describe('verifyEventAdmin', () => {
    it('should pass if user is event admin', async () => {
      await expect(
        verifyEventAdmin('user-123', 'user-123')
      ).resolves.toBeUndefined();
    });

    it('should throw 403 if user is not event admin', async () => {
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      await expect(
        verifyEventAdmin('user-123', 'user-456')
      ).rejects.toThrow();
    });

    it('should log unauthorized event admin access', async () => {
      const { logger } = require('@/utils/logger');
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      try {
        await verifyEventAdmin('user-123', 'user-456');
      } catch (e) {
        // Expected
      }

      expect(logger.warn).toHaveBeenCalledWith(
        'Unauthorized event admin access',
        expect.objectContaining({
          userId: 'user-123',
          eventAdminId: 'user-456',
        })
      );
    });
  });

  describe('withAuth', () => {
    it('should call handler with session if authenticated', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
        expires: new Date().toISOString(),
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = withAuth(mockHandler);

      await wrappedHandler(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse
      );

      expect(mockHandler).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        mockSession
      );
    });

    it('should throw if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      (createApiError as jest.Mock).mockImplementation(
        (message, status, code) => {
          const error = new Error(message);
          (error as any).statusCode = status;
          (error as any).code = code;
          return error;
        }
      );

      const mockHandler = jest.fn();
      const wrappedHandler = withAuth(mockHandler);

      await expect(
        wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow();

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});
