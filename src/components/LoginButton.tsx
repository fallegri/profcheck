"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export function LoginButton() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingIn(true);
    try {
      await logout();
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Welcome, {user?.name || user?.email}
        </span>
        <button
          onClick={handleLogout}
          disabled={isLoggingIn}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-red-300 transition-colors"
        >
          {isLoggingIn ? "Logging out..." : "Logout"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoggingIn}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center gap-2"
    >
      {isLoggingIn ? "Signing in..." : "Sign in with Google"}
    </button>
  );
}
