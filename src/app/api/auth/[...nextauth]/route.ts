/**
 * NextAuth route handler — App Router
 *
 * Re-uses the shared authOptions from src/lib/auth.ts so that both the
 * Pages Router (if used) and the App Router share identical configuration.
 *
 * Token encryption is handled inside authOptions:
 *  - signIn callback  → persists encrypted tokens in User table (BD)
 *  - jwt callback     → stores encrypted tokens in the JWT
 *
 * Validates: Requirements 11.0, 11.1, 11.2, 11.3, 11.4
 */
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
