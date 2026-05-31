/**
 * Rate Limiter Usage Examples
 * 
 * This file demonstrates how to use the rate limiting middleware
 * in different API endpoints based on their sensitivity level.
 */

import { NextApiRequest, NextApiResponse } from "next";
import {
  strictRateLimit,
  normalRateLimit,
  lenientRateLimit,
} from "./rateLimiter";
import { withErrorHandler } from "./errorHandler";
import { withAuth } from "./auth";
import { withMiddleware } from "./errorHandler";

/**
 * Example 1: Strict Rate Limit for Sensitive Endpoint
 * 
 * POST /api/events/create - Create a new event
 * Limit: 10 requests per minute
 * 
 * This endpoint is sensitive because it:
 * - Creates resources in the database
 * - Interacts with Google Drive API
 * - Should be protected from abuse
 */
export async function createEventHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Handler logic here
  const { name, description } = req.body;

  // Validate and create event
  res.status(201).json({
    success: true,
    event: {
      id: "event-123",
      name,
      description,
    },
  });
}

// Apply strict rate limit + error handling + authentication
export default withMiddleware(
  createEventHandler,
  withErrorHandler,
  withAuth,
  strictRateLimit
);

/**
 * Example 2: Strict Rate Limit for Delete Endpoint
 * 
 * DELETE /api/events/[id] - Delete an event
 * Limit: 10 requests per minute
 * 
 * This endpoint is sensitive because it:
 * - Deletes resources permanently
 * - Should be protected from accidental abuse
 */
export async function deleteEventHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  // Delete event logic here
  res.status(200).json({
    success: true,
    message: `Event ${id} deleted`,
  });
}

// Apply strict rate limit for delete operations
export const deleteEventWithRateLimit = withMiddleware(
  deleteEventHandler,
  withErrorHandler,
  withAuth,
  strictRateLimit
);

/**
 * Example 3: Strict Rate Limit for Configuration Endpoint
 * 
 * POST /api/events/[id]/professions/configure - Configure professions
 * Limit: 10 requests per minute
 * 
 * This endpoint is sensitive because it:
 * - Modifies event configuration
 * - Affects what visitors see
 */
export async function configureProfessionsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { professionIds } = req.body;

  // Configure professions logic here
  res.status(200).json({
    success: true,
    message: `Professions configured for event ${id}`,
  });
}

// Apply strict rate limit for configuration
export const configureProfessionsWithRateLimit = withMiddleware(
  configureProfessionsHandler,
  withErrorHandler,
  withAuth,
  strictRateLimit
);

/**
 * Example 4: Normal Rate Limit for Standard Endpoint
 * 
 * GET /api/events - List events
 * Limit: 100 requests per minute
 * 
 * This endpoint is standard because it:
 * - Only reads data
 * - Is used by authenticated users
 * - Doesn't modify state
 */
export async function listEventsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // List events logic here
  res.status(200).json({
    success: true,
    events: [
      { id: "event-1", name: "Event 1" },
      { id: "event-2", name: "Event 2" },
    ],
  });
}

// Apply normal rate limit for read operations
export const listEventsWithRateLimit = withMiddleware(
  listEventsHandler,
  withErrorHandler,
  withAuth,
  normalRateLimit
);

/**
 * Example 5: Normal Rate Limit for Update Endpoint
 * 
 * PUT /api/events/[id] - Update event
 * Limit: 100 requests per minute
 * 
 * This endpoint is standard because it:
 * - Updates existing resources
 * - Is used by authenticated users
 * - Doesn't create new resources
 */
export async function updateEventHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { name, description } = req.body;

  // Update event logic here
  res.status(200).json({
    success: true,
    event: {
      id,
      name,
      description,
    },
  });
}

// Apply normal rate limit for update operations
export const updateEventWithRateLimit = withMiddleware(
  updateEventHandler,
  withErrorHandler,
  withAuth,
  normalRateLimit
);

/**
 * Example 6: Lenient Rate Limit for Public Endpoint
 * 
 * GET /api/events/[id]/professions - Get professions for event
 * Limit: 1000 requests per minute
 * 
 * This endpoint is public because it:
 * - Is accessed by visitors (not authenticated)
 * - Only reads data
 * - Should handle high traffic
 */
export async function getProfessionsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  // Get professions logic here
  res.status(200).json({
    success: true,
    professions: [
      { id: "prof-1", name: "Engineer" },
      { id: "prof-2", name: "Doctor" },
    ],
  });
}

// Apply lenient rate limit for public endpoints
export const getProfessionsWithRateLimit = withMiddleware(
  getProfessionsHandler,
  withErrorHandler,
  lenientRateLimit
);

/**
 * Example 7: Lenient Rate Limit for Wheel Endpoint
 * 
 * GET /api/events/[id]/wheel - Get wheel data
 * Limit: 1000 requests per minute
 * 
 * This endpoint is public because it:
 * - Is accessed by visitors (not authenticated)
 * - Only reads data
 * - Should handle high traffic from many visitors
 */
export async function getWheelHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  // Get wheel data logic here
  res.status(200).json({
    success: true,
    wheel: {
      eventId: id,
      professions: [],
    },
  });
}

// Apply lenient rate limit for public wheel endpoint
export const getWheelWithRateLimit = withMiddleware(
  getWheelHandler,
  withErrorHandler,
  lenientRateLimit
);

/**
 * Example 8: Recording Visitor Selection
 * 
 * POST /api/selections/record - Record a profession selection
 * Limit: 100 requests per minute (normal)
 * 
 * This endpoint is standard because it:
 * - Creates records for visitor selections
 * - Is accessed by visitors (not authenticated)
 * - Should handle moderate traffic
 */
export async function recordSelectionHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { eventId, professionId, sessionId } = req.body;

  // Record selection logic here
  res.status(201).json({
    success: true,
    selection: {
      id: "selection-123",
      eventId,
      professionId,
      sessionId,
    },
  });
}

// Apply normal rate limit for selection recording
export const recordSelectionWithRateLimit = withMiddleware(
  recordSelectionHandler,
  withErrorHandler,
  normalRateLimit
);

/**
 * Rate Limiting Strategy Summary
 * 
 * STRICT (10/min):
 * - POST /api/events/create
 * - DELETE /api/events/[id]
 * - POST /api/events/[id]/professions/configure
 * - POST /api/professions/upload-image
 * 
 * NORMAL (100/min):
 * - GET /api/events
 * - PUT /api/events/[id]
 * - POST /api/selections/record
 * - GET /api/events/[id]/selections
 * - GET /api/events/[id]/selections/export
 * 
 * LENIENT (1000/min):
 * - GET /api/events/[id]/professions
 * - GET /api/events/[id]/wheel
 * - GET /api/sessions/[sessionId]
 * - POST /api/sessions/create
 * 
 * Response Headers:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * - Retry-After: Seconds to wait before retrying (when rate limited)
 * 
 * Error Response (429 Too Many Requests):
 * {
 *   "success": false,
 *   "error": "Too many requests, please try again later",
 *   "code": "RATE_LIMIT_EXCEEDED",
 *   "details": {
 *     "retryAfter": 45,
 *     "resetTime": "2024-05-30T22:05:00.000Z"
 *   }
 * }
 */
