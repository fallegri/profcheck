/**
 * Error Handler Examples
 * 
 * This file demonstrates various ways to use the error handling middleware
 * in different scenarios and error types.
 */

import { NextApiRequest, NextApiResponse } from "next";
import {
  handleApiError,
  createApiError,
  withErrorHandler,
  getErrorTrackingData,
  getErrorStatistics,
} from "./errorHandler";
import { z } from "zod";

// ============================================================================
// Example 1: Basic Error Handling with withErrorHandler
// ============================================================================

/**
 * Simple endpoint with automatic error handling
 */
export const example1_basicErrorHandling = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      throw createApiError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
    }

    // Your code here
    res.status(200).json({ message: "Success" });
  }
);

// ============================================================================
// Example 2: Validation Error Handling
// ============================================================================

const userSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required"),
  age: z.number().positive("Age must be positive"),
});

export const example2_validationError = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      throw createApiError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
    }

    // Validate input - will throw ZodError if invalid
    const userData = userSchema.parse(req.body);

    // Process valid data
    res.status(201).json({ user: userData });
  }
);

// ============================================================================
// Example 3: Authentication Error Handling
// ============================================================================

export const example3_authenticationError = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw createApiError("Missing authentication token", 401, "UNAUTHORIZED");
    }

    // Verify token
    const isValid = verifyToken(token);
    if (!isValid) {
      throw createApiError("Invalid or expired token", 401, "UNAUTHORIZED");
    }

    res.status(200).json({ message: "Authenticated" });
  }
);

// ============================================================================
// Example 4: Authorization Error Handling
// ============================================================================

export const example4_authorizationError = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const userId = req.query.userId as string;
    const currentUserId = "user123"; // From session

    if (userId !== currentUserId) {
      throw createApiError(
        "You don't have permission to access this resource",
        403,
        "FORBIDDEN"
      );
    }

    res.status(200).json({ message: "Authorized" });
  }
);

// ============================================================================
// Example 5: Not Found Error Handling
// ============================================================================

export const example5_notFoundError = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const eventId = req.query.id as string;

    // Simulate database lookup
    const event = await findEventById(eventId);

    if (!event) {
      throw createApiError("Event not found", 404, "EVENT_NOT_FOUND");
    }

    res.status(200).json(event);
  }
);

// ============================================================================
// Example 6: Database Error Handling
// ============================================================================

export const example6_databaseError = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Simulate database operation
      const result = await performDatabaseOperation();
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("connection")) {
        throw createApiError(
          "Database connection failed",
          500,
          "DB_CONNECTION_ERROR"
        );
      }
      throw error;
    }
  }
);

// ============================================================================
// Example 7: Validation with Error Details
// ============================================================================

export const example7_validationWithDetails = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { email, password } = req.body;

    // Manual validation with details
    if (!email) {
      throw createApiError(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        { field: "email", reason: "Email is required" }
      );
    }

    if (!password || password.length < 8) {
      throw createApiError(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        { field: "password", reason: "Password must be at least 8 characters" }
      );
    }

    res.status(200).json({ message: "Valid" });
  }
);

// ============================================================================
// Example 8: Conditional Error Handling
// ============================================================================

export const example8_conditionalError = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const eventId = req.query.id as string;
    const action = req.query.action as string;

    // Check if event exists
    const event = await findEventById(eventId);
    if (!event) {
      throw createApiError("Event not found", 404, "EVENT_NOT_FOUND");
    }

    // Check if event is active
    if (!event.isActive) {
      throw createApiError(
        "Event is not active",
        400,
        "EVENT_INACTIVE",
        { eventId, status: event.status }
      );
    }

    // Check if action is valid
    if (!["start", "stop", "pause"].includes(action)) {
      throw createApiError(
        "Invalid action",
        400,
        "INVALID_ACTION",
        { action, validActions: ["start", "stop", "pause"] }
      );
    }

    res.status(200).json({ message: "Action performed" });
  }
);

// ============================================================================
// Example 9: Error Tracking and Monitoring
// ============================================================================

export const example9_errorTracking = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.query.action === "get-stats") {
      // Get error statistics
      const stats = getErrorStatistics();
      return res.status(200).json(stats);
    }

    if (req.query.action === "get-recent") {
      // Get recent errors
      const limit = parseInt(req.query.limit as string) || 10;
      const recentErrors = getErrorTrackingData(limit);
      return res.status(200).json(recentErrors);
    }

    throw createApiError("Invalid action", 400, "INVALID_ACTION");
  }
);

// ============================================================================
// Example 10: Operational vs Programming Errors
// ============================================================================

export const example10_operationalVsProgrammingErrors = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const eventId = req.query.id as string;

    // Operational error (expected)
    if (!eventId) {
      throw createApiError(
        "Event ID is required",
        400,
        "MISSING_EVENT_ID",
        undefined,
        true // isOperational
      );
    }

    // Programming error (unexpected)
    if (typeof eventId !== "string") {
      throw createApiError(
        "Event ID must be a string",
        500,
        "INVALID_EVENT_ID_TYPE",
        undefined,
        false // isOperational
      );
    }

    res.status(200).json({ eventId });
  }
);

// ============================================================================
// Example 11: Chained Error Handling
// ============================================================================

export const example11_chainedErrorHandling = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Step 1: Validate input
      const eventId = req.query.id as string;
      if (!eventId) {
        throw createApiError("Event ID is required", 400, "MISSING_EVENT_ID");
      }

      // Step 2: Fetch event
      const event = await findEventById(eventId);
      if (!event) {
        throw createApiError("Event not found", 404, "EVENT_NOT_FOUND");
      }

      // Step 3: Check permissions
      const userId = req.query.userId as string;
      if (event.adminId !== userId) {
        throw createApiError(
          "You don't have permission to access this event",
          403,
          "FORBIDDEN"
        );
      }

      // Step 4: Perform operation
      const result = await performOperation(event);

      res.status(200).json(result);
    } catch (error) {
      // Re-throw to be caught by withErrorHandler
      throw error;
    }
  }
);

// ============================================================================
// Example 12: Error Handling with Logging Context
// ============================================================================

export const example12_errorWithContext = withErrorHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const eventId = req.query.id as string;
    const context = `POST /api/events/${eventId}/process`;

    try {
      // Your code here
      const event = await findEventById(eventId);
      if (!event) {
        throw createApiError("Event not found", 404, "EVENT_NOT_FOUND");
      }

      res.status(200).json(event);
    } catch (error) {
      // handleApiError is called automatically by withErrorHandler
      // but you can also call it manually with context
      if (error instanceof Error) {
        throw error;
      }
      throw error;
    }
  }
);

// ============================================================================
// Helper Functions (Mock implementations)
// ============================================================================

function verifyToken(token: string): boolean {
  // Mock implementation
  return token.length > 0;
}

async function findEventById(id: string): Promise<any> {
  // Mock implementation
  if (id === "valid-id") {
    return { id, name: "Test Event", adminId: "user123", isActive: true };
  }
  return null;
}

async function performDatabaseOperation(): Promise<any> {
  // Mock implementation
  return { success: true };
}

async function performOperation(event: any): Promise<any> {
  // Mock implementation
  return { success: true, event };
}

// ============================================================================
// Usage in API Routes
// ============================================================================

/**
 * Example API route using error handler:
 * 
 * // pages/api/events/[id].ts
 * import { withErrorHandler, createApiError } from '@/middleware/errorHandler';
 * 
 * async function handler(req, res) {
 *   if (req.method !== 'GET') {
 *     throw createApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
 *   }
 * 
 *   const event = await findEventById(req.query.id);
 *   if (!event) {
 *     throw createApiError('Event not found', 404, 'EVENT_NOT_FOUND');
 *   }
 * 
 *   res.status(200).json(event);
 * }
 * 
 * export default withErrorHandler(handler);
 */

// ============================================================================
// Error Response Examples
// ============================================================================

/**
 * Validation Error Response (400):
 * {
 *   "success": false,
 *   "error": "Validation error",
 *   "code": "VALIDATION_ERROR",
 *   "details": [
 *     {
 *       "path": "email",
 *       "message": "Invalid email format"
 *     }
 *   ]
 * }
 */

/**
 * Not Found Error Response (404):
 * {
 *   "success": false,
 *   "error": "Event not found",
 *   "code": "EVENT_NOT_FOUND"
 * }
 */

/**
 * Server Error Response (500):
 * {
 *   "success": false,
 *   "error": "Internal server error",
 *   "code": "INTERNAL_ERROR"
 * }
 */

/**
 * Error with Details Response (400):
 * {
 *   "success": false,
 *   "error": "Validation failed",
 *   "code": "VALIDATION_ERROR",
 *   "details": {
 *     "field": "email",
 *     "reason": "Email is required"
 *   }
 * }
 */
