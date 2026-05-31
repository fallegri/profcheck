import { NextApiRequest, NextApiResponse } from "next";
import { ZodError, z } from "zod";
import { Prisma } from "@prisma/client";
import {
  handleApiError,
  createApiError,
  withErrorHandler,
  getErrorTrackingData,
  clearErrorTrackingData,
  getErrorStatistics,
} from "./errorHandler";
import { logger } from "@/utils/logger";

// Mock logger
jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("errorHandler middleware", () => {
  let mockRes: Partial<NextApiResponse>;
  let mockReq: Partial<NextApiRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearErrorTrackingData();

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockReq = {
      method: "POST",
      url: "/api/test",
      headers: {
        "user-agent": "test-agent",
      },
      socket: {
        remoteAddress: "127.0.0.1",
      } as any,
    };
  });

  describe("handleApiError", () => {
    it("should handle Zod validation errors", () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive(),
      });

      const result = schema.safeParse({ name: "", age: -5 });
      if (!result.success) {
        handleApiError(result.error, mockRes as NextApiResponse, mockReq as NextApiRequest);
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: expect.any(Array),
        })
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should handle custom API errors with status code", () => {
      const error = createApiError("Not found", 404, "NOT_FOUND");

      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Not found",
          code: "NOT_FOUND",
        })
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should handle server errors (5xx) with error logging", () => {
      const error = createApiError("Database connection failed", 500, "DB_ERROR");

      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle unknown errors", () => {
      const unknownError = "Some unknown error";

      handleApiError(unknownError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it("should sanitize sensitive information from error messages", () => {
      const error = createApiError(
        "Connection failed: postgresql://user:password@localhost/db",
        500,
        "DB_ERROR"
      );

      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error).not.toContain("password");
      expect(callArgs.error).toContain("***");
    });

    it("should sanitize API keys from error messages", () => {
      const error = createApiError(
        "Authorization failed: Bearer sk_live_abc123def456",
        401,
        "AUTH_ERROR"
      );

      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error).not.toContain("sk_live_abc123def456");
      expect(callArgs.error).toContain("***");
    });

    it("should include context in logs", () => {
      const error = createApiError("Test error", 400, "TEST_ERROR");
      const context = "POST /api/events/create";

      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest, context);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(context),
        expect.any(Object)
      );
    });

    it("should track errors for monitoring", () => {
      const error = createApiError("Test error", 400, "TEST_ERROR");

      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const trackingData = getErrorTrackingData();
      expect(trackingData.length).toBeGreaterThan(0);
      expect(trackingData[trackingData.length - 1]).toMatchObject({
        errorCode: "TEST_ERROR",
        statusCode: 400,
        message: "Test error",
      });
    });

    it("should include error details in response when provided", () => {
      const details = { field: "email", reason: "already exists" };
      const error = createApiError("Validation failed", 400, "VALIDATION_ERROR", details);

      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.details).toEqual(details);
    });
  });

  describe("createApiError", () => {
    it("should create error with default status code", () => {
      const error = createApiError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it("should create error with custom status code", () => {
      const error = createApiError("Not found", 404, "NOT_FOUND");

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });

    it("should create error with details", () => {
      const details = { field: "name" };
      const error = createApiError("Validation error", 400, "VALIDATION_ERROR", details);

      expect(error.details).toEqual(details);
    });

    it("should mark error as operational", () => {
      const error = createApiError("Test error", 400, "TEST_ERROR", undefined, true);

      expect(error.isOperational).toBe(true);
    });

    it("should mark error as non-operational", () => {
      const error = createApiError("Test error", 500, "TEST_ERROR", undefined, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe("withErrorHandler", () => {
    it("should wrap handler and catch errors", async () => {
      const handler = jest.fn().mockRejectedValue(new Error("Test error"));
      const wrapped = withErrorHandler(handler);

      await wrapped(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it("should call handler successfully", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withErrorHandler(handler);

      await wrapped(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should handle API errors in wrapped handler", async () => {
      const error = createApiError("Not found", 404, "NOT_FOUND");
      const handler = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandler(handler);

      await wrapped(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe("Error tracking", () => {
    it("should track errors", () => {
      const error = createApiError("Test error 1", 400, "ERROR_1");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const error2 = createApiError("Test error 2", 500, "ERROR_2");
      handleApiError(error2, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const trackingData = getErrorTrackingData();
      expect(trackingData.length).toBe(2);
    });

    it("should limit tracking data to 1000 entries", () => {
      for (let i = 0; i < 1100; i++) {
        const error = createApiError(`Error ${i}`, 400, `ERROR_${i}`);
        handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);
      }

      const trackingData = getErrorTrackingData();
      expect(trackingData.length).toBeLessThanOrEqual(1000);
    });

    it("should clear tracking data", () => {
      const error = createApiError("Test error", 400, "TEST_ERROR");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      let trackingData = getErrorTrackingData();
      expect(trackingData.length).toBeGreaterThan(0);

      clearErrorTrackingData();
      trackingData = getErrorTrackingData();
      expect(trackingData.length).toBe(0);
    });

    it("should get error statistics", () => {
      const error1 = createApiError("Error 1", 400, "ERROR_1");
      const error2 = createApiError("Error 2", 400, "ERROR_1");
      const error3 = createApiError("Error 3", 500, "ERROR_2");

      handleApiError(error1, mockRes as NextApiResponse, mockReq as NextApiRequest);
      handleApiError(error2, mockRes as NextApiResponse, mockReq as NextApiRequest);
      handleApiError(error3, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const stats = getErrorStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byCode["ERROR_1"]).toBe(2);
      expect(stats.byCode["ERROR_2"]).toBe(1);
      expect(stats.byStatus[400]).toBe(2);
      expect(stats.byStatus[500]).toBe(1);
    });

    it("should include recent errors in statistics", () => {
      const error = createApiError("Test error", 400, "TEST_ERROR");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const stats = getErrorStatistics();
      expect(stats.recent.length).toBeGreaterThan(0);
      expect(stats.recent[0].errorCode).toBe("TEST_ERROR");
    });
  });

  describe("Error response format", () => {
    it("should return consistent error response format", () => {
      const error = createApiError("Test error", 400, "TEST_ERROR");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty("success", false);
      expect(callArgs).toHaveProperty("error");
      expect(callArgs).toHaveProperty("code");
    });

    it("should not include stack trace in response", () => {
      const error = createApiError("Test error", 500, "TEST_ERROR");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("stack");
    });

    it("should not include sensitive data in response", () => {
      const error = createApiError(
        "Database error: postgresql://user:pass@host/db",
        500,
        "DB_ERROR"
      );
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(callArgs)).not.toContain("pass");
    });
  });

  describe("Different error types", () => {
    it("should handle validation errors", () => {
      const schema = z.object({ email: z.string().email() });
      const result = schema.safeParse({ email: "invalid" });

      if (!result.success) {
        handleApiError(result.error, mockRes as NextApiResponse, mockReq as NextApiRequest);
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("should handle authentication errors", () => {
      const error = createApiError("Unauthorized", 401, "UNAUTHORIZED");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should handle authorization errors", () => {
      const error = createApiError("Forbidden", 403, "FORBIDDEN");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it("should handle not found errors", () => {
      const error = createApiError("Resource not found", 404, "NOT_FOUND");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it("should handle server errors", () => {
      const error = createApiError("Internal server error", 500, "INTERNAL_ERROR");
      handleApiError(error, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("Prisma error handling", () => {
    it("should handle Prisma unique constraint violation (P2002) as 409", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002", clientVersion: "5.0.0" }
      );

      handleApiError(prismaError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: "DUPLICATE_RECORD",
        })
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should handle Prisma record not found (P2025) as 404", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "5.0.0" }
      );

      handleApiError(prismaError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: "NOT_FOUND",
        })
      );
    });

    it("should handle Prisma foreign key constraint (P2003) as 400", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        { code: "P2003", clientVersion: "5.0.0" }
      );

      handleApiError(prismaError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: "FOREIGN_KEY_ERROR",
        })
      );
    });

    it("should handle Prisma validation error as 400", () => {
      const prismaError = new Prisma.PrismaClientValidationError(
        "Validation error",
        { clientVersion: "5.0.0" }
      );

      handleApiError(prismaError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Invalid data provided",
          code: "DB_VALIDATION_ERROR",
        })
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should handle Prisma initialization error as 503", () => {
      const prismaError = new Prisma.PrismaClientInitializationError(
        "Connection failed",
        "5.0.0"
      );

      handleApiError(prismaError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Service temporarily unavailable",
          code: "DB_CONNECTION_ERROR",
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it("should not expose Prisma error details to client", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`email`)",
        { code: "P2002", clientVersion: "5.0.0" }
      );

      handleApiError(prismaError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      // Should not expose raw Prisma error message
      expect(callArgs.error).not.toContain("Unique constraint failed on the fields");
      expect(callArgs).not.toHaveProperty("stack");
    });

    it("should track Prisma errors for monitoring", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "5.0.0" }
      );

      handleApiError(prismaError, mockRes as NextApiResponse, mockReq as NextApiRequest);

      const trackingData = getErrorTrackingData();
      expect(trackingData.length).toBeGreaterThan(0);
      expect(trackingData[trackingData.length - 1]).toMatchObject({
        errorCode: "NOT_FOUND",
        statusCode: 404,
      });
    });
  });
});
