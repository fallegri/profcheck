/**
 * Input Validation and Sanitization Utilities
 * Provides comprehensive validation and escaping for all API inputs
 */

/**
 * HTML entity escape map for special characters
 */
const HTML_ESCAPE_MAP: { [key: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param input - String to escape
 * @returns Escaped string safe for HTML context
 */
export function escapeHtml(input: string): string {
  if (typeof input !== "string") return input;
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Escape SQL special characters to prevent SQL injection
 * Note: This is a basic escape. Use parameterized queries when possible.
 * @param input - String to escape
 * @returns Escaped string safe for SQL context
 */
export function escapeSql(input: string): string {
  if (typeof input !== "string") return input;
  return input.replace(/'/g, "''").replace(/\\/g, "\\\\");
}

/**
 * Escape JavaScript special characters
 * @param input - String to escape
 * @returns Escaped string safe for JavaScript context
 */
export function escapeJavaScript(input: string): string {
  if (typeof input !== "string") return input;
  return input
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Escape URL special characters
 * @param input - String to escape
 * @returns Escaped string safe for URL context
 */
export function escapeUrl(input: string): string {
  if (typeof input !== "string") return input;
  return encodeURIComponent(input);
}

/**
 * Comprehensive input sanitization combining multiple escape strategies
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return input;

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Remove control characters (except tab, newline, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Escape HTML special characters
  sanitized = escapeHtml(sanitized);

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize object recursively
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID/CUID format
 * @param id - ID to validate
 * @returns True if valid UUID/CUID format
 */
export function isValidId(id: string): boolean {
  // CUID pattern: starts with 'c' followed by alphanumeric characters
  const cuidPattern = /^c[a-z0-9]+$/i;
  // UUID pattern
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return cuidPattern.test(id) || uuidPattern.test(id);
}

/**
 * Validate session ID format (alphanumeric, hyphens, underscores)
 * @param sessionId - Session ID to validate
 * @returns True if valid session ID format
 */
export function isValidSessionId(sessionId: string): boolean {
  const sessionIdPattern = /^[a-zA-Z0-9_-]+$/;
  return sessionIdPattern.test(sessionId);
}

/**
 * Validate image URL format
 * @param url - URL to validate
 * @returns True if URL points to a valid image file
 */
export function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  return imageExtensions.test(url);
}

/**
 * Truncate string to maximum length
 * @param input - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncateString(input: string, maxLength: number): string {
  if (typeof input !== "string") return input;
  if (input.length <= maxLength) return input;
  return input.substring(0, maxLength - 3) + "...";
}

/**
 * Validate input length
 * @param input - String to validate
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @returns True if length is within bounds
 */
export function isValidLength(
  input: string,
  minLength: number,
  maxLength: number
): boolean {
  if (typeof input !== "string") return false;
  return input.length >= minLength && input.length <= maxLength;
}

/**
 * Remove potentially dangerous patterns from input
 * @param input - String to clean
 * @returns Cleaned string
 */
export function removeDangerousPatterns(input: string): string {
  if (typeof input !== "string") return input;

  // Remove script tags and content
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  cleaned = cleaned.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: protocol
  cleaned = cleaned.replace(/javascript:/gi, "");

  // Remove data: protocol (can be used for XSS)
  cleaned = cleaned.replace(/data:text\/html/gi, "");

  return cleaned;
}

/**
 * Validate and sanitize input with comprehensive checks
 * @param input - Input to validate
 * @param options - Validation options
 * @returns Validated and sanitized input
 */
export interface ValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  pattern?: RegExp;
}

export function validateAndSanitize(
  input: string,
  options: ValidationOptions = {}
): string {
  if (typeof input !== "string") return "";

  const {
    minLength = 0,
    maxLength = 10000,
    allowHtml = false,
    allowSpecialChars = false,
    pattern,
  } = options;

  // Check length
  if (input.length < minLength || input.length > maxLength) {
    throw new Error(
      `Input length must be between ${minLength} and ${maxLength} characters`
    );
  }

  // Check pattern if provided
  if (pattern && !pattern.test(input)) {
    throw new Error("Input does not match required pattern");
  }

  // Remove dangerous patterns
  let sanitized = removeDangerousPatterns(input);

  // Sanitize based on options
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  }

  if (!allowSpecialChars) {
    // Remove special characters except common ones
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.@]/g, "");
  }

  return sanitized.trim();
}
