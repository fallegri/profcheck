import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEventSchema } from "@/schemas/event";
import { createEventFolder } from "@/services/googleDrive";
import { logger } from "@/utils/logger";
import { withErrorHandler, createApiError } from "@/middleware/errorHandler";
import { validateBody, validateMethod } from "@/middleware/validation";
import { requireAuth } from "@/middleware/auth";
import { strictRateLimit } from "@/middleware/rateLimiter";
import { encrypt, decrypt } from "@/utils/encryption";
import { encryptEventData, decryptEventData } from "@/utils/encryptedData";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate HTTP method
  validateMethod(req, ["POST"]);

  // Require authentication
  const session = await requireAuth(req, res);

  // Validate input
  const bodyData = await validateBody(req, createEventSchema);
  const { name, description } = bodyData as { name: string; description: string };

  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || "" },
  });

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // Create event in database
  const event = await prisma.event.create({
    data: {
      name,
      description,
      adminId: user.id,
    },
  });

  // Create folder in Google Drive
  let googleFolderId: string | null = null;
  let googleFolderUrl: string | null = null;

  try {
    const accessToken = (session.user as any)?.accessToken;
    if (accessToken) {
      // Decrypt token if encrypted
      let decryptedToken = accessToken;
      try {
        decryptedToken = decrypt(accessToken);
      } catch (e) {
        // Token might not be encrypted, use as-is
        decryptedToken = accessToken;
      }

      googleFolderId = await createEventFolder(decryptedToken, name);

      // Get folder details to get the URL
      if (googleFolderId) {
        const { getFolderDetails } = await import("@/services/googleDrive");
        const folderDetails = await getFolderDetails(
          decryptedToken,
          googleFolderId
        );
        googleFolderUrl = folderDetails.webViewLink;

        // Update event with folder ID and URL (encrypted using encryptEventData)
        const encryptedData = encryptEventData({
          googleFolderId,
          googleFolderUrl,
        });

        await prisma.event.update({
          where: { id: event.id },
          data: encryptedData,
        });
      }
    }
  } catch (error) {
    logger.error("Failed to create Google Drive folder", error);
    // Continue without folder - not critical
  }

  logger.info(`Event created: ${event.id}`, { userId: user.id });

  return res.status(201).json({
    id: event.id,
    name: event.name,
    description: event.description,
    googleFolderId,
    googleFolderUrl,
    createdAt: event.createdAt,
  });
}

// Apply middleware: error handling, rate limiting
export default strictRateLimit(withErrorHandler(handler));
