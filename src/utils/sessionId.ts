import { randomBytes } from "crypto";

/**
 * Generate a unique session ID
 * @returns Unique session ID
 */
export function generateSessionId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Generate a unique token
 * @returns Unique token
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Validate session ID format
 * @param sessionId - Session ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidSessionId(sessionId: string): boolean {
  // Session IDs should be 32 character hex strings
  return /^[a-f0-9]{32}$/.test(sessionId);
}
