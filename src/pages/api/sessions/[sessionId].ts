import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateQuery } from "@/middleware/validation";
import { lenientRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";
import { z } from "zod";

const querySchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["GET"]);

  // Validate query parameters
  const queryData = await validateQuery(req, querySchema);
  const { sessionId } = queryData as { sessionId: string };

  // Get session by ID
  const session = await prisma.visitorSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw createApiError("Session not found", 404, "NOT_FOUND");
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    throw createApiError("Session expired", 404, "SESSION_EXPIRED");
  }

  // Update last activity
  await prisma.visitorSession.update({
    where: { id: sessionId },
    data: {
      updatedAt: new Date(),
    },
  });

  logger.info(`Retrieved session: ${sessionId}`);

  return res.status(200).json({
    success: true,
    data: {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      eventId: session.eventId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    },
  });
}

// Apply middleware: error handling, rate limiting
export default lenientRateLimit(withErrorHandler(handler));
