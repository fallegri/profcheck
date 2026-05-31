import { NextApiRequest, NextApiResponse } from "next";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "@/utils/logger";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

/**
 * Error tracking for monitoring and debugging
 * Stores error metadata for analysis
 */
interface ErrorTrackingData {
  timestamp: string;
  errorCode: string;
  statusCode: number;
  message: string;
  context: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
}

/**
 * Error tracking store (in production, this would be sent to a monitoring service)
 */
const errorTrackingStore: ErrorTrackingData[] = [];

/**
 * Track error for monitoring purposes
 */
function trackError(data: ErrorTrackingData): void {
  errorTrackingStore.push(data);
  
  // Keep only last 1000 errors in memory
  if (errorTrackingStore.length > 1000) {
    errorTrackingStore.shift();
  }

  // In production, send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to monitoring service
    // sendToMonitoringService(data);
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Check if error is operational (expected) or programming error
 */
function isOperationalError(error: unknown): boolean {
  if (error instanceof ZodError) return true;
  if (error instanceof Error) {
    const apiError = error as ApiError;
    return apiError.isOperational === true || apiError.statusCode !== undefined;
  }
  return false;
}

/**
 * Sanitize error message to hide sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  // Hide database connection strings
  message = message.replace(/postgresql:\/\/[^@]+@[^/]+/gi, "postgresql://***");
  
  // Hide API keys and tokens
  message = message.replace(/Bearer\s+[^\s]+/gi, "Bearer ***");
  message = message.replace(/api[_-]?key[=:]\s*[^\s]+/gi, "api_key=***");
  
  // Hide email addresses in some contexts
  if (message.includes("database") || message.includes("connection")) {
    message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***@***.***");
  }
  
  return message;
}

/**
 * Handle API errors and return appropriate response
 * Logs errors with appropriate severity levels
 * Hides sensitive information in responses
 * Tracks errors for monitoring
 */
export function handleApiError(
  error: unknown,
  res: NextApiResponse,
  req?: NextApiRequest,
  context?: string
): void {
  const contextStr = context ? ` [${context}]` : "";
  const method = req?.method || "UNKNOWN";
  const url = req?.url || "unknown";
  const userAgent = req?.headers["user-agent"] as string | undefined;
  const clientIp = req ? getClientIp(req) : "unknown";

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errorCode = "VALIDATION_ERROR";
    const statusCode = 400;
    
    logger.warn(`Validation error${contextStr}:`, {
      issues: error.issues,
      method,
      url,
    });

    trackError({
      timestamp: new Date().toISOString(),
      errorCode,
      statusCode,
      message: "Validation error",
      context: contextStr,
      userAgent,
      ip: clientIp,
      method,
      url,
    });

    return res.status(statusCode).json({
      success: false,
      error: "Validation error",
      code: errorCode,
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // Handle Prisma known request errors (constraint violations, not found, etc.)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    let statusCode = 400;
    let message = "Database error";
    let code = "DB_ERROR";

    switch (error.code) {
      case "P2002":
        // Unique constraint violation
        statusCode = 409;
        message = "A record with this data already exists";
        code = "DUPLICATE_RECORD";
        break;
      case "P2025":
        // Record not found
        statusCode = 404;
        message = "Record not found";
        code = "NOT_FOUND";
        break;
      case "P2003":
        // Foreign key constraint violation
        statusCode = 400;
        message = "Related record not found";
        code = "FOREIGN_KEY_ERROR";
        break;
      case "P2014":
        // Required relation violation
        statusCode = 400;
        message = "Required relation is missing";
        code = "RELATION_ERROR";
        break;
      default:
        statusCode = 400;
        message = "Database request error";
        code = `DB_${error.code}`;
    }

    logger.warn(`Prisma known error${contextStr}: [${error.code}] ${error.message}`, {
      prismaCode: error.code,
      statusCode,
      method,
      url,
    });

    trackError({
      timestamp: new Date().toISOString(),
      errorCode: code,
      statusCode,
      message,
      context: contextStr,
      userAgent,
      ip: clientIp,
      method,
      url,
    });

    return res.status(statusCode).json({
      success: false,
      error: message,
      code,
    });
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    const statusCode = 400;
    const code = "DB_VALIDATION_ERROR";

    logger.warn(`Prisma validation error${contextStr}:`, {
      message: error.message,
      method,
      url,
    });

    trackError({
      timestamp: new Date().toISOString(),
      errorCode: code,
      statusCode,
      message: "Database validation error",
      context: contextStr,
      userAgent,
      ip: clientIp,
      method,
      url,
    });

    return res.status(statusCode).json({
      success: false,
      error: "Invalid data provided",
      code,
    });
  }

  // Handle Prisma initialization errors (connection issues)
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    const statusCode = 503;
    const code = "DB_CONNECTION_ERROR";

    logger.error(`Prisma initialization/connection error${contextStr}:`, {
      message: error.message,
      method,
      url,
    });

    trackError({
      timestamp: new Date().toISOString(),
      errorCode: code,
      statusCode,
      message: "Service temporarily unavailable",
      context: contextStr,
      userAgent,
      ip: clientIp,
      method,
      url,
    });

    return res.status(statusCode).json({
      success: false,
      error: "Service temporarily unavailable",
      code,
    });
  }

  // Handle custom API errors
  if (error instanceof Error) {
    const apiError = error as ApiError;
    const statusCode = apiError.statusCode || 500;
    let message = apiError.message || "Internal server error";
    const code = apiError.code || "INTERNAL_ERROR";
    const isOperational = isOperationalError(error);

    // Sanitize message to hide sensitive information
    const sanitizedMessage = sanitizeErrorMessage(message);

    // Log error with appropriate level
    if (statusCode >= 500) {
      logger.error(`Server error${contextStr}: ${message}`, {
        statusCode,
        code,
        stack: apiError.stack,
        isOperational,
        method,
        url,
      });
    } else {
      logger.warn(`Client error${contextStr}: ${message}`, {
        statusCode,
        code,
        method,
        url,
      });
    }

    trackError({
      timestamp: new Date().toISOString(),
      errorCode: code,
      statusCode,
      message: sanitizedMessage,
      context: contextStr,
      userAgent,
      ip: clientIp,
      method,
      url,
    });

    // Return sanitized error message to client
    const response: any = {
      success: false,
      error: sanitizedMessage,
      code,
    };
    
    if (apiError.details) {
      response.details = apiError.details;
    }
    
    return res.status(statusCode).json(response);
  }

  // Handle unknown errors
  const errorCode = "INTERNAL_ERROR";
  const statusCode = 500;
  
  logger.error(`Unknown error${contextStr}:`, {
    error,
    method,
    url,
    stack: error instanceof Error ? error.stack : undefined,
  });

  trackError({
    timestamp: new Date().toISOString(),
    errorCode,
    statusCode,
    message: "Internal server error",
    context: contextStr,
    userAgent,
    ip: clientIp,
    method,
    url,
  });

  return res.status(statusCode).json({
    success: false,
    error: "Internal server error",
    code: errorCode,
  });
}

/**
 * Create an API error with status code and error code
 * Supports operational errors (expected) and programming errors
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown,
  isOperational: boolean = true
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = isOperational;
  return error;
}

/**
 * Wrap async API route handlers with error handling
 * Catches all errors and returns appropriate response
 */
export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error, res, req, `${req.method} ${req.url}`);
    }
  };
}

/**
 * Combine multiple middleware wrappers
 */
export function withMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  ...middlewares: Array<(h: any) => any>
) {
  let wrapped = handler;
  for (const middleware of middlewares.reverse()) {
    wrapped = middleware(wrapped);
  }
  return wrapped;
}

/**
 * Get error tracking data for monitoring
 * Returns recent errors for analysis
 */
export function getErrorTrackingData(limit: number = 100): ErrorTrackingData[] {
  return errorTrackingStore.slice(-limit);
}

/**
 * Clear error tracking data
 */
export function clearErrorTrackingData(): void {
  errorTrackingStore.length = 0;
}

/**
 * Get error statistics
 */
export function getErrorStatistics() {
  const stats = {
    total: errorTrackingStore.length,
    byCode: {} as Record<string, number>,
    byStatus: {} as Record<number, number>,
    recent: errorTrackingStore.slice(-10),
  };

  for (const error of errorTrackingStore) {
    stats.byCode[error.errorCode] = (stats.byCode[error.errorCode] || 0) + 1;
    stats.byStatus[error.statusCode] = (stats.byStatus[error.statusCode] || 0) + 1;
  }

  return stats;
}
