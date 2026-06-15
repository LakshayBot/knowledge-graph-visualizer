"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const fetchApi = useCallback(
    async (
      path: string,
      options: RequestInit & { auth?: boolean } = {},
    ): Promise<{ data?: T; error?: string }> => {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await apiFetch<T>(path, options);
        setState({ data, error: null, loading: false });
        return { data };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        // Don't update state if we're about to redirect
        if (message.includes("redirecting to login")) {
          return { error: "Session expired" };
        }
        setState({ data: null, error: message, loading: false });
        return { error: message };
      }
    },
    [],
  );

  return { ...state, fetchApi, setState };
}
