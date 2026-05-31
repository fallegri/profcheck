import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/utils/sessionId";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateBody } from "@/middleware/validation";
import { lenientRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";
import { z } from "zod";

const bodySchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["POST"]);

  // Validate input
  const bodyData = await validateBody(req, bodySchema);
  const { eventId } = bodyData as { eventId: string };

  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw createApiError("Event not found", 404, "NOT_FOUND");
  }

  // Generate unique session token
  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create visitor session
  const session = await prisma.visitorSession.create({
    data: {
      sessionToken,
      eventId,
      expiresAt,
    },
  });

  logger.info(`Visitor session created: ${session.id}`, { eventId });

  return res.status(201).json({
    success: true,
    data: {
      sessionId: session.id,
      sessionToken: session.sessionToken,
    },
  });
}

// Apply middleware: error handling, rate limiting
export default lenientRateLimit(withErrorHandler(handler));
