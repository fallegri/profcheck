import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { encrypt } from "@/utils/encryption";
import { logger } from "@/utils/logger";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, persist tokens and profile in the JWT
      if (account && profile) {
        token.accessToken = account.access_token
          ? encrypt(account.access_token)
          : null;
        token.refreshToken = account.refresh_token
          ? encrypt(account.refresh_token)
          : null;
        token.googleId = account.providerAccountId;
        token.picture = (profile as any).picture ?? token.picture;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).refreshToken = token.refreshToken;
        (session.user as any).googleId = token.googleId;
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
