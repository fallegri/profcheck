import { z } from 'zod'

// CUID validation pattern
const cuidPattern = /^c[^\s-]*$/

// Session ID validation - alphanumeric and hyphens only
const sessionIdPattern = /^[a-zA-Z0-9_-]+$/

export const recordSelectionSchema = z.object({
  eventId: z.string()
    .min(1, 'Event ID is required')
    .regex(cuidPattern, 'Invalid event ID format'),
  professionId: z.string()
    .min(1, 'Profession ID is required')
    .regex(cuidPattern, 'Invalid profession ID format'),
  sessionId: z.string()
    .min(1, 'Session ID is required')
    .regex(sessionIdPattern, 'Session ID contains invalid characters'),
})

export type RecordSelectionInput = z.infer<typeof recordSelectionSchema>

export const selectionQuerySchema = z.object({
  id: z.string()
    .min(1, 'Event ID is required'),
  limit: z.coerce.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10),
  offset: z.coerce.number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0),
})

export type SelectionQueryInput = z.infer<typeof selectionQuerySchema>
