import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateQuery } from "@/middleware/validation";
import { requireAuth, verifyEventAdmin } from "@/middleware/auth";
import { strictRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";
import { z } from "zod";

const querySchema = z.object({
  id: z.string().min(1, "Event ID is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["DELETE"]);

  // Require authentication
  const session = await requireAuth(req, res);

  // Validate query parameters
  const queryData = await validateQuery(req, querySchema);
  const { id } = queryData as { id: string };

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

  // Delete event (cascade delete will handle related data)
  await prisma.event.delete({
    where: { id },
  });

  logger.info(`Event deleted: ${id}`, { userId: user.id });

  return res.status(200).json({
    success: true,
    message: "Event deleted successfully",
  });
}

// Apply middleware: error handling, rate limiting, authentication
export default strictRateLimit(withErrorHandler(handler));
