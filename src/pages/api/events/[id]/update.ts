import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { updateEventSchema } from "@/schemas/event";
import { logger } from "@/utils/logger";
import { withErrorHandler, createApiError } from "@/middleware/errorHandler";
import { validateMethod, validateBody, validateQuery } from "@/middleware/validation";
import { requireAuth, verifyEventAdmin } from "@/middleware/auth";
import { strictRateLimit } from "@/middleware/rateLimiter";
import { z } from "zod";

const querySchema = z.object({
  id: z.string().min(1, "Event ID is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["PUT"]);

  // Require authentication
  const session = await requireAuth(req, res);

  // Validate query parameters
  const queryData = await validateQuery(req, querySchema);
  const { id } = queryData as { id: string };

  // Validate input
  const bodyData = await validateBody<z.infer<typeof updateEventSchema>>(req, updateEventSchema);

  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
  });

  if (!user) {
    throw createApiError("User not found", 401, "USER_NOT_FOUND");
  }

  // Check if event exists and belongs to user
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw createApiError("Event not found", 404, "NOT_FOUND");
  }

  // Verify user is event admin
  await verifyEventAdmin(user.id, event.adminId);

  // Update event
  const updatedEvent = await prisma.event.update({
    where: { id },
    data: bodyData as any,
  });

  logger.info(`Event updated: ${id}`, { userId: user.id });

  return res.status(200).json({
    id: updatedEvent.id,
    name: updatedEvent.name,
    description: updatedEvent.description,
    updatedAt: updatedEvent.updatedAt,
  });
}

// Apply middleware: error handling, rate limiting, authentication
export default strictRateLimit(withErrorHandler(handler));
