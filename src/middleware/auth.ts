import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createApiError } from "./errorHandler";
import { logger } from "@/utils/logger";

/**
 * Require authentication for API routes using NextAuth session
 * Validates that user has an active session
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
      logger.warn("Unauthorized access attempt", {
        method: req.method,
        url: req.url,
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      });

      throw createApiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return session;
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode === 401) {
      throw error;
    }
    logger.error("Authentication error", error);
    throw createApiError("Authentication failed", 500, "AUTH_ERROR");
  }
}

/**
 * Wrap async API route handlers with authentication
 * Ensures user is authenticated before handler executes
 */
export function withAuth(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    session: any
  ) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await requireAuth(req, res);
      return handler(req, res, session);
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Verify that user owns the resource
 * Used to protect admin endpoints
 */
export async function verifyOwnership(
  userId: string,
  resourceOwnerId: string
): Promise<void> {
  if (userId !== resourceOwnerId) {
    logger.warn("Unauthorized resource access", {
      userId,
      resourceOwnerId,
    });

    throw createApiError("Forbidden", 403, "FORBIDDEN");
  }
}

/**
 * Verify that user is admin of an event
 * Checks if user owns the event
 */
export async function verifyEventAdmin(
  userId: string,
  eventAdminId: string
): Promise<void> {
  if (userId !== eventAdminId) {
    logger.warn("Unauthorized event admin access", {
      userId,
      eventAdminId,
    });

    throw createApiError("Forbidden - Not event admin", 403, "FORBIDDEN");
  }
}
