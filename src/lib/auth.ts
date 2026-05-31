import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/utils/encryption";
import { logger } from "@/utils/logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          // Request offline access to get a refresh token
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Persist encrypted Google tokens in the User record so server-side
     * code (e.g. Google Drive API calls) can retrieve them without
     * exposing plaintext tokens in the database.
     *
     * Validates: Requirements 11.0, 11.1, 11.2
     */
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const encryptedAccessToken = account.access_token
            ? encrypt(account.access_token)
            : null;
          const encryptedRefreshToken = account.refresh_token
            ? encrypt(account.refresh_token)
            : null;

          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              ...(encryptedAccessToken && { accessToken: encryptedAccessToken }),
              ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
            },
            create: {
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
              googleId: account.providerAccountId,
              ...(encryptedAccessToken && { accessToken: encryptedAccessToken }),
              ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
            },
          });
        } catch (error) {
          logger.error("Failed to persist encrypted tokens for user:", error);
          // Do not block sign-in if token persistence fails
        }
      }
      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        // Store encrypted tokens in the JWT as well (for client-side use)
        token.accessToken = encrypt(account.access_token || "");
        token.refreshToken = account.refresh_token
          ? encrypt(account.refresh_token)
          : null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).refreshToken = token.refreshToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
