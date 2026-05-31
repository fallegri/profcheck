import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { configureProfessionSchema } from "@/schemas/profession";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateBody, validateQuery } from "@/middleware/validation";
import { requireAuth, verifyEventAdmin } from "@/middleware/auth";
import { strictRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";
import { z } from "zod";

const querySchema = z.object({
  id: z.string().min(1, "Event ID is required"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["POST"]);

  // Require authentication
  const session = await requireAuth(req, res);

  // Validate query parameters
  const queryData = await validateQuery(req, querySchema);
  const { id } = queryData as { id: string };

  // Validate input
  const bodyData = await validateBody(req, configureProfessionSchema);
  const { professions } = bodyData as { professions: Array<{ professionId: string; order: number }> };

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

  // Delete existing event professions
  await prisma.eventProfession.deleteMany({
    where: { eventId: id },
  });

  // Create new event professions
  const createdProfessions = await Promise.all(
    professions.map((p) =>
      prisma.eventProfession.create({
        data: {
          eventId: id,
          professionId: p.professionId,
          order: p.order,
        },
        include: {
          profession: true,
        },
      })
    )
  );

  logger.info(
    `Configured ${createdProfessions.length} professions for event`,
    { eventId: id, userId: user.id }
  );

  return res.status(200).json({
    success: true,
    data: {
      professions: createdProfessions.map((ep) => ({
        id: ep.profession.id,
        name: ep.profession.name,
        displayOrder: ep.order,
      })),
    },
  });
}

// Apply middleware: error handling, rate limiting, authentication
export default strictRateLimit(withErrorHandler(handler));
