"use client";

import { useEffect, useState } from "react";

const SESSION_STORAGE_KEY = "visitor_session_id";
const SESSION_TOKEN_KEY = "visitor_session_token";

/**
 * Hook to manage visitor session
 * Generates and retrieves a unique session ID for each visitor
 */
export function useVisitorSession(eventId?: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Check if session already exists in localStorage
        const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
        const storedSessionToken = localStorage.getItem(SESSION_TOKEN_KEY);

        if (storedSessionId && storedSessionToken) {
          // Validate session with backend
          try {
            const response = await fetch(`/api/sessions/${storedSessionId}`);
            if (response.ok) {
              setSessionId(storedSessionId);
              setSessionToken(storedSessionToken);
              setIsLoading(false);
              return;
            }
          } catch {
            // Session validation failed, create new one
          }
        }

        // Create new session if eventId is provided
        if (eventId) {
          const createResponse = await fetch("/api/sessions/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ eventId }),
          });

          if (createResponse.ok) {
            const data = await createResponse.json();
            localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
            localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
            setSessionId(data.sessionId);
            setSessionToken(data.sessionToken);
          } else {
            setError("Failed to create session");
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize session"
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [eventId]);

  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setSessionId(null);
    setSessionToken(null);
  };

  return {
    sessionId,
    sessionToken,
    isLoading,
    error,
    clearSession,
  };
}
