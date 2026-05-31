import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadProfessionImageSchema } from "@/schemas/profession";
import { logger } from "@/utils/logger";
import { withErrorHandler } from "@/middleware/errorHandler";
import { validateMethod, validateBody } from "@/middleware/validation";
import { requireAuth } from "@/middleware/auth";
import { strictRateLimit } from "@/middleware/rateLimiter";
import { createApiError } from "@/middleware/errorHandler";

// Note: This is a simplified implementation
// In production, you would use a library like multer or formidable to handle file uploads
// and sharp to resize images

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["POST"]);

  // Require authentication
  const session = await requireAuth(req, res);

  // Validate input using the schema from schemas/profession.ts
  const bodyData = await validateBody(req, uploadProfessionImageSchema);
  const { professionId, imageUrl } = bodyData;

  // Check if profession exists
  const profession = await prisma.profession.findUnique({
    where: { id: professionId },
  });

  if (!profession) {
    throw createApiError("Profession not found", 404, "NOT_FOUND");
  }

  // Update profession with image URL
  const updatedProfession = await prisma.profession.update({
    where: { id: professionId },
    data: {
      imageUrl,
    },
  });

  logger.info(`Image uploaded for profession: ${professionId}`, {
    userId: session.user?.email,
  });

  return res.status(200).json({
    success: true,
    data: {
      imageUrl: updatedProfession.imageUrl,
    },
  });
}

// Apply middleware: error handling, rate limiting, authentication
export default strictRateLimit(withErrorHandler(handler));
