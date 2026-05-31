"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useCallback } from "react";

/**
 * Hook to access authentication state and methods
 */
export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isUnauthenticated = status === "unauthenticated";

  const user = session?.user;

  const login = useCallback(async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  }, []);

  const logout = useCallback(async () => {
    await signOut({ callbackUrl: "/" });
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    login,
    logout,
  };
}
