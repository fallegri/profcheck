import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { validateBody, withValidation, parseOrThrow } from "./validation";
import { createApiError } from "./errorHandler";

// Mock dependencies
jest.mock("./errorHandler", () => ({
  createApiError: jest.fn((message, statusCode, code, details) => {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
  }),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockRes(): Partial<NextApiResponse> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function makeMockReq(
  overrides: Partial<NextApiRequest> = {}
): Partial<NextApiRequest> {
  return {
    method: "POST",
    url: "/api/test",
    headers: {},
    body: {},
    query: {},
    ...overrides,
  };
}

// ─── Test schemas ────────────────────────────────────────────────────────────

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().int().min(0, "Age must be non-negative"),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── validateBody ────────────────────────────────────────────────────────────

describe("validateBody", () => {
  it("returns success with parsed data for valid input", () => {
    const result = validateBody(userSchema, { name: "Alice", age: 30 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("returns failure with details for invalid input", () => {
    const result = validateBody(userSchema, { name: "", age: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation error");
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.details.length).toBeGreaterThan(0);
    }
  });

  it("includes field path in error details", () => {
    const result = validateBody(userSchema, { name: "Alice", age: "not-a-number" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const agePath = result.details.find((d) => d.path === "age");
      expect(agePath).toBeDefined();
    }
  });

  it("returns failure for missing required fields", () => {
    const result = validateBody(userSchema, {});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("returns success for empty object when schema allows it", () => {
    const emptySchema = z.object({});
    const result = validateBody(emptySchema, {});

    expect(result.success).toBe(true);
  });
});

// ─── withValidation ──────────────────────────────────────────────────────────

describe("withValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST / PUT / PATCH — validates req.body", () => {
    it("calls handler with validatedData when body is valid", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withValidation(userSchema, handler);

      const req = makeMockReq({ method: "POST", body: { name: "Bob", age: 25 } });
      const res = makeMockRes();

      await wrapped(req as NextApiRequest, res as NextApiResponse);

      expect(handler).toHaveBeenCalledTimes(1);
      const calledReq = handler.mock.calls[0][0];
      expect(calledReq.validatedData).toEqual({ name: "Bob", age: 25 });
    });

    it("returns 400 and does NOT call handler when body is invalid", async () => {
      const handler = jest.fn();
      const wrapped = withValidation(userSchema, handler);

      const req = makeMockReq({ method: "POST", body: { name: "", age: -5 } });
      const res = makeMockRes();

      await wrapped(req as NextApiRequest, res as NextApiResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: expect.any(Array),
        })
      );
    });

    it("validates body for PUT requests", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withValidation(userSchema, handler);

      const req = makeMockReq({ method: "PUT", body: { name: "Carol", age: 40 } });
      const res = makeMockRes();

      await wrapped(req as NextApiRequest, res as NextApiResponse);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("validates body for PATCH requests", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withValidation(userSchema, handler);

      const req = makeMockReq({ method: "PATCH", body: { name: "Dave", age: 22 } });
      const res = makeMockRes();

      await wrapped(req as NextApiRequest, res as NextApiResponse);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET / DELETE — validates req.query", () => {
    it("calls handler with validatedData when query is valid", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withValidation(querySchema, handler);

      const req = makeMockReq({ method: "GET", query: { limit: "20", offset: "5" } });
      const res = makeMockRes();

      await wrapped(req as NextApiRequest, res as NextApiResponse);

      expect(handler).toHaveBeenCalledTimes(1);
      const calledReq = handler.mock.calls[0][0];
      expect(calledReq.validatedData).toEqual({ limit: 20, offset: 5 });
    });

    it("returns 400 when query is invalid", async () => {
      const handler = jest.fn();
      const wrapped = withValidation(querySchema, handler);

      const req = makeMockReq({ method: "GET", query: { limit: "999" } });
      const res = makeMockRes();

      await wrapped(req as NextApiRequest, res as NextApiResponse);

      expect(handler).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("validates query for DELETE requests", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withValidation(querySchema, handler);

      const req = makeMockReq({ method: "DELETE", query: { limit: "10", offset: "0" } });
      const res = makeMockRes();

      await wrapped(req as NextApiRequest, res as NextApiResponse);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  it("includes field-level details in 400 response", async () => {
    const handler = jest.fn();
    const wrapped = withValidation(userSchema, handler);

    const req = makeMockReq({ method: "POST", body: { name: "X", age: "bad" } });
    const res = makeMockRes();

    await wrapped(req as NextApiRequest, res as NextApiResponse);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.details).toBeInstanceOf(Array);
    expect(jsonArg.details[0]).toHaveProperty("path");
    expect(jsonArg.details[0]).toHaveProperty("message");
  });
});

// ─── parseOrThrow ────────────────────────────────────────────────────────────

describe("parseOrThrow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns parsed data for valid input", () => {
    const data = parseOrThrow(userSchema, { name: "Eve", age: 28 });
    expect(data).toEqual({ name: "Eve", age: 28 });
  });

  it("throws an ApiError for invalid input", () => {
    expect(() => parseOrThrow(userSchema, { name: "", age: -1 })).toThrow();
    expect(createApiError).toHaveBeenCalledWith(
      "Validation error",
      400,
      "VALIDATION_ERROR",
      expect.any(Array)
    );
  });

  it("passes field-level details to createApiError", () => {
    try {
      parseOrThrow(userSchema, { name: "Alice", age: "not-a-number" });
    } catch {
      // expected
    }

    const detailsArg = (createApiError as jest.Mock).mock.calls[0][3];
    expect(detailsArg).toBeInstanceOf(Array);
    expect(detailsArg[0]).toHaveProperty("path");
    expect(detailsArg[0]).toHaveProperty("message");
  });

  it("does not throw for valid data", () => {
    expect(() =>
      parseOrThrow(userSchema, { name: "Frank", age: 0 })
    ).not.toThrow();
  });
});
