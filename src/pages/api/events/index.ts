import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod } from "@/middleware/validation";
import { requireAuth } from "@/middleware/auth";
import { normalRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";
import { decryptEventData, decryptArray } from "@/utils/encryptedData";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["GET"]);

  // Require authentication
  const session = await requireAuth(req, res);

  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
  });

  if (!user) {
    throw createApiError("User not found", 401, "USER_NOT_FOUND");
  }

  // Get events for user
  const events = await prisma.event.findMany({
    where: { adminId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      googleFolderId: true,
      googleFolderUrl: true,
    },
  });

  logger.info(`Retrieved ${events.length} events for user`, {
    userId: user.id,
  });

  // Decrypt sensitive data using encryptedData utility
  const decryptedEvents = decryptArray(events, decryptEventData);

  return res.status(200).json({
    success: true,
    data: decryptedEvents,
  });
}

// Apply middleware: error handling, rate limiting, authentication
export default normalRateLimit(withErrorHandler(handler));
