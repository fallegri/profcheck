import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateQuery } from "@/middleware/validation";
import { lenientRateLimit } from "@/middleware/rateLimiter";
import { z } from "zod";
import { decryptEventData } from "@/utils/encryptedData";

const querySchema = z.object({
  id: z.string().min(1, "Event ID is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["GET"]);

  // Validate query parameters
  const queryData = await validateQuery(req, querySchema);
  const { id } = queryData as { id: string };

  // Get event with professions
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      professions: {
        include: {
          profession: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({
      success: false,
      error: "Event not found",
      code: "NOT_FOUND",
    });
  }

  logger.info(`Retrieved event: ${id}`);

  // Decrypt sensitive data using encryptedData utility
  const decryptedEvent = decryptEventData(event);

  return res.status(200).json({
    success: true,
    data: {
      id: decryptedEvent.id,
      name: decryptedEvent.name,
      description: decryptedEvent.description,
      googleFolderId: decryptedEvent.googleFolderId,
      googleFolderUrl: decryptedEvent.googleFolderUrl,
      createdAt: decryptedEvent.createdAt,
      updatedAt: decryptedEvent.updatedAt,
      professions: event.professions.map((ep) => ({
        id: ep.profession.id,
        name: ep.profession.name,
        description: ep.profession.description,
        imageUrl: ep.profession.imageUrl,
        futureInfo: ep.profession.futureInfo,
        displayOrder: ep.order,
      })),
    },
  });
}

// Apply middleware: error handling, rate limiting
export default lenientRateLimit(withErrorHandler(handler));
