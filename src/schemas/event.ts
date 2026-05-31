import { z } from "zod";

// Event creation schema with enhanced validation
export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, "Event name is required")
    .max(100, "Event name must be less than 100 characters")
    .refine(
      (val) => !/[<>"`]/g.test(val),
      "Event name contains invalid characters"
    ),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters")
    .refine(
      (val) => !/[<>"`]/g.test(val),
      "Description contains invalid characters"
    ),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

// Event update schema with enhanced validation
export const updateEventSchema = z.object({
  name: z
    .string()
    .min(1, "Event name is required")
    .max(100, "Event name must be less than 100 characters")
    .refine(
      (val) => !/[<>"`]/g.test(val),
      "Event name contains invalid characters"
    )
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters")
    .refine(
      (val) => !/[<>"`]/g.test(val),
      "Description contains invalid characters"
    )
    .optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// Event ID schema
export const eventIdSchema = z.object({
  id: z.string().cuid("Invalid event ID"),
});

export type EventIdInput = z.infer<typeof eventIdSchema>;
