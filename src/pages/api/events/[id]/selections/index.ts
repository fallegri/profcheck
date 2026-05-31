import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { selectionQuerySchema } from "@/schemas/selection";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateQuery } from "@/middleware/validation";
import { requireAuth, verifyEventAdmin } from "@/middleware/auth";
import { normalRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["GET"]);

  // Require authentication
  const session = await requireAuth(req, res);

  // Validate query parameters
  const queryData = await validateQuery(req, selectionQuerySchema);
  const { id, limit, offset } = queryData as { id: string; limit: number; offset: number };

  // Verify event exists and user is admin
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw createApiError("Event not found", 404, "NOT_FOUND");
  }

  // Check if user is the admin of this event
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
  });

  if (!user) {
    throw createApiError("User not found", 401, "USER_NOT_FOUND");
  }

  // Verify user is event admin
  await verifyEventAdmin(user.id, event.adminId);

  // Get total count
  const total = await prisma.visitorSelection.count({
    where: { eventId: id },
  });

  // Get selections with pagination
  const selections = await prisma.visitorSelection.findMany({
    where: { eventId: id },
    include: {
      profession: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset,
  });

  // Group by profession and count
  const professionCounts = new Map<string, { name: string; count: number }>();
  selections.forEach((selection) => {
    const key = selection.professionId;
    const existing = professionCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      professionCounts.set(key, {
        name: selection.profession.name,
        count: 1,
      });
    }
  });

  const groupedSelections = Array.from(professionCounts.entries()).map(
    ([professionId, data]) => ({
      professionId,
      professionName: data.name,
      count: data.count,
      percentage: total > 0 ? ((data.count / total) * 100).toFixed(2) : "0.00",
    })
  );

  logger.info(`Retrieved selections for event: ${id}`, {
    userId: user.id,
    total,
  });

  return res.status(200).json({
    success: true,
    data: {
      total,
      selections: groupedSelections,
      limit,
      offset,
    },
  });
}

// Apply middleware: error handling, rate limiting, authentication
export default normalRateLimit(withErrorHandler(handler));
