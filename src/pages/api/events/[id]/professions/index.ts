import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateQuery } from "@/middleware/validation";
import { lenientRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";
import { getCached, TTL } from "@/utils/cache";
import { z } from "zod";

const querySchema = z.object({
  id: z.string().min(1, "Event ID is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["GET"]);

  // Validate query parameters
  const queryData = await validateQuery(req, querySchema);
  const { id } = queryData as { id: string };

  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw createApiError("Event not found", 404, "NOT_FOUND");
  }

  // Get professions for event — cached for 5 minutes
  const cacheKey = `professions:event:${id}`;
  const professionData = await getCached(cacheKey, TTL.FIVE_MINUTES, async () => {
    const eventProfessions = await prisma.eventProfession.findMany({
      where: { eventId: id },
      select: {
        order: true,
        profession: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            futureInfo: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    return eventProfessions.map((ep) => ({
      id: ep.profession.id,
      name: ep.profession.name,
      description: ep.profession.description,
      imageUrl: ep.profession.imageUrl,
      futureInfo: ep.profession.futureInfo,
      displayOrder: ep.order,
    }));
  });

  logger.info(`Retrieved ${professionData.length} professions for event`, {
    eventId: id,
  });

  return res.status(200).json({
    success: true,
    data: professionData,
  });
}

// Apply middleware: error handling, rate limiting
export default lenientRateLimit(withErrorHandler(handler));
