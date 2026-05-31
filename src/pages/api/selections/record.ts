import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { recordSelectionSchema } from "@/schemas/selection";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateBody } from "@/middleware/validation";
import { lenientRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["POST"]);

  // Validate input
  const bodyData = await validateBody(req, recordSelectionSchema);
  const { eventId, professionId, sessionId } = bodyData as { eventId: string; professionId: string; sessionId: string };

  // Verify event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw createApiError("Event not found", 404, "NOT_FOUND");
  }

  // Verify profession exists and is configured for this event
  const eventProfession = await prisma.eventProfession.findUnique({
    where: {
      eventId_professionId: {
        eventId,
        professionId,
      },
    },
  });

  if (!eventProfession) {
    throw createApiError(
      "Profession not configured for this event",
      404,
      "NOT_FOUND"
    );
  }

  // Verify session exists
  const session = await prisma.visitorSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw createApiError("Session not found", 404, "NOT_FOUND");
  }

  // Check if session belongs to this event
  if (session.eventId !== eventId) {
    throw createApiError(
      "Session does not belong to this event",
      400,
      "INVALID_SESSION"
    );
  }

  // Record the selection
  const selection = await prisma.visitorSelection.create({
    data: {
      eventId,
      professionId,
      sessionId,
      timestamp: new Date(),
    },
  });

  logger.info(`Selection recorded: ${selection.id}`, {
    eventId,
    professionId,
    sessionId,
  });

  return res.status(201).json({
    success: true,
    data: {
      id: selection.id,
      selectedAt: selection.timestamp,
    },
  });
}

// Apply middleware: error handling, rate limiting
export default lenientRateLimit(withErrorHandler(handler));
