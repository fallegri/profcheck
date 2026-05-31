import { NextApiRequest, NextApiResponse } from "next";
import { ZodSchema, ZodError } from "zod";
import { createApiError } from "./errorHandler";
import { logger } from "@/utils/logger";

/**
 * Result of a validation operation
 */
export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  code: string;
  details: Array<{ path: string; message: string }>;
}

export type ValidationOutcome<T> = ValidationResult<T> | ValidationError;

/**
 * Validate that the request uses one of the allowed HTTP methods.
 * Throws an ApiError with status 405 if the method is not allowed.
 *
 * @param req     - Next.js API request
 * @param methods - Array of allowed HTTP methods (e.g. ["GET", "POST"])
 */
export function validateMethod(
  req: NextApiRequest,
  methods: string[]
): void {
  const method = req.method?.toUpperCase() ?? "";
  const allowed = methods.map((m) => m.toUpperCase());
  if (!allowed.includes(method)) {
    throw createApiError(
      `Method ${method} not allowed`,
      405,
      "METHOD_NOT_ALLOWED"
    );
  }
}

/**
 * Validate data directly against a Zod schema.
 * Returns a typed result without throwing.
 *
 * Supports two call signatures:
 *   validateBody(schema, data)          — original signature
 *   validateBody(req, schema)           — convenience signature used by handlers
 *
 * When called with (req, schema) the body is extracted from req.body and the
 * result is returned synchronously (the Promise wrapper is kept for backwards
 * compatibility with handlers that await the call).
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationOutcome<T>;
export function validateBody<T>(
  req: NextApiRequest,
  schema: ZodSchema<T>
): Promise<T>;
export function validateBody<T>(
  schemaOrReq: ZodSchema<T> | NextApiRequest,
  dataOrSchema: unknown
): ValidationOutcome<T> | Promise<T> {
  // Detect (req, schema) call: first arg has a `body` property
  if (
    schemaOrReq !== null &&
    typeof schemaOrReq === "object" &&
    "body" in schemaOrReq
  ) {
    const req = schemaOrReq as NextApiRequest;
    const schema = dataOrSchema as ZodSchema<T>;
    const result = schema.safeParse(req.body);

    if (result.success) {
      return Promise.resolve(result.data);
    }

    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    logger.warn("Request body validation failed", {
      method: req.method,
      url: req.url,
      details,
    });

    return Promise.reject(
      createApiError("Validation error", 400, "VALIDATION_ERROR", details)
    );
  }

  // Original (schema, data) call
  const schema = schemaOrReq as ZodSchema<T>;
  const data = dataOrSchema;
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  logger.warn("Validation failed", { details });

  return {
    success: false,
    error: "Validation error",
    code: "VALIDATION_ERROR",
    details,
  };
}

/**
 * Validate query parameters against a Zod schema.
 * Throws an ApiError with status 400 if validation fails.
 *
 * @param req    - Next.js API request
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated query data
 */
export async function validateQuery<T>(
  req: NextApiRequest,
  schema: ZodSchema<T>
): Promise<T> {
  const result = schema.safeParse(req.query);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  logger.warn("Request query validation failed", {
    method: req.method,
    url: req.url,
    details,
  });

  throw createApiError("Validation error", 400, "VALIDATION_ERROR", details);
}

/**
 * Higher-order function that wraps a Next.js API route handler with Zod
 * validation.
 *
 * - For POST / PUT / PATCH requests the schema is applied to `req.body`.
 * - For GET / DELETE / HEAD requests the schema is applied to `req.query`.
 *
 * On validation failure the handler is NOT called and a 400 response with
 * field-level error details is returned immediately.
 *
 * @param schema  - Zod schema to validate against
 * @param handler - The API route handler to protect
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (
    req: NextApiRequest & { validatedData: T },
    res: NextApiResponse
  ) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const isBodyMethod = ["POST", "PUT", "PATCH"].includes(
      req.method?.toUpperCase() ?? ""
    );
    const rawData = isBodyMethod ? req.body : req.query;

    const result = schema.safeParse(rawData);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      logger.warn("Request validation failed", {
        method: req.method,
        url: req.url,
        details,
      });

      res.status(400).json({
        success: false,
        error: "Validation error",
        code: "VALIDATION_ERROR",
        details,
      });
      return;
    }

    // Attach validated (and typed) data to the request object
    (req as NextApiRequest & { validatedData: T }).validatedData = result.data;

    await handler(req as NextApiRequest & { validatedData: T }, res);
  };
}

/**
 * Parse and validate a Zod schema, throwing an ApiError on failure.
 * Useful inside handlers that already use withErrorHandler.
 *
 * @param schema - Zod schema to validate against
 * @param data   - Raw data to validate
 * @throws ApiError with status 400 when validation fails
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  logger.warn("Validation error (parseOrThrow)", { details });

  throw createApiError("Validation error", 400, "VALIDATION_ERROR", details);
}
