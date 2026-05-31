import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { logger } from '@/utils/logger'
import { withErrorHandler, createApiError } from '@/middleware/errorHandler'
import { validateMethod, validateQuery } from '@/middleware/validation'
import { requireAuth, verifyEventAdmin } from '@/middleware/auth'
import { normalRateLimit } from '@/middleware/rateLimiter'
import { z } from 'zod'

const querySchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
})

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validate HTTP method
  validateMethod(req, ['GET'])

  // Require authentication
  const session = await requireAuth(req, res)

  // Validate query parameters
  const queryData = await validateQuery(req, querySchema)
  const { id } = queryData as { id: string }

  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
  })

  if (!user) {
    throw createApiError('User not found', 401, 'USER_NOT_FOUND')
  }

  // Verify event exists and user is admin
  const event = await prisma.event.findUnique({
    where: { id },
  })

  if (!event) {
    throw createApiError('Event not found', 404, 'NOT_FOUND')
  }

  // Verify user is event admin
  await verifyEventAdmin(user.id, event.adminId)

  // Get all selections for this event
  const selections = await prisma.visitorSelection.findMany({
    where: { eventId: id },
    include: {
      profession: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  })

  // Generate CSV
  const csvHeader = 'Profession,Timestamp,Session ID\n'
  const csvRows = selections
    .map((selection) => {
      const profession = selection.profession.name
      const timestamp = selection.timestamp.toISOString()
      const sessionId = selection.sessionId
      // Escape quotes in values
      return `"${profession.replace(/"/g, '""')}","${timestamp}","${sessionId}"`
    })
    .join('\n')

  const csv = csvHeader + csvRows

  logger.info(`Exported selections for event: ${id}`, { userId: user.id })

  // Set response headers for CSV download
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="selections_${id}_${new Date().toISOString().split('T')[0]}.csv"`
  )

  return res.status(200).send(csv)
}

// Apply middleware: error handling, rate limiting, authentication
export default normalRateLimit(withErrorHandler(handler))
