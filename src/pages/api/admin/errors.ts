import { NextApiRequest, NextApiResponse } from "next";
import { getErrorStatistics, getErrorTrackingData, withErrorHandler } from "@/middleware/errorHandler";
import { requireAuth } from "@/middleware/auth";
import { logger } from "@/utils/logger";

/**
 * GET /api/admin/errors
 *
 * Returns error statistics and recent error tracking data.
 * Restricted to authenticated administrators only.
 *
 * Query params:
 *   limit  – number of recent raw error entries to include (default: 50, max: 200)
 */
async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Require authenticated session
  await requireAuth(req, res);

  const rawLimit = parseInt((req.query.limit as string) || "50", 10);
  const limit = Math.min(isNaN(rawLimit) ? 50 : rawLimit, 200);

  const statistics = getErrorStatistics();
  const recentErrors = getErrorTrackingData(limit);

  logger.info("Admin errors endpoint accessed", {
    method: req.method,
    url: req.url,
    limit,
  });

  return res.status(200).json({
    success: true,
    data: {
      statistics,
      recentErrors,
    },
  });
}

export default withErrorHandler(handler);
