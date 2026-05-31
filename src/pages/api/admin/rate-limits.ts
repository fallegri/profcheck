import { NextApiRequest, NextApiResponse } from "next";
import { getRateLimitStats } from "@/middleware/rateLimiter";
import { withErrorHandler } from "@/middleware/errorHandler";
import { requireAuth } from "@/middleware/auth";
import { logger } from "@/utils/logger";

/**
 * GET /api/admin/rate-limits
 *
 * Returns current rate-limiting statistics (tracked clients and request counts).
 * Restricted to authenticated administrators only.
 */
async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  await requireAuth(req, res);

  const stats = getRateLimitStats();

  logger.info("Admin rate-limits endpoint accessed", {
    method: req.method,
    url: req.url,
  });

  return res.status(200).json({
    success: true,
    data: stats,
  });
}

export default withErrorHandler(handler);
