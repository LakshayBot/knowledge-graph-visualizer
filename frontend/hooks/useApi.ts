"use client";

import { useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

function handleSessionExpired() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/login?expired=1";
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

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) ?? {}),
      };

      if (options.auth !== false) {
        const token = localStorage.getItem("accessToken");
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

        if (res.status === 401) {
          const rt = localStorage.getItem("refreshToken");
          if (rt) {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: rt }),
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem("accessToken", refreshData.accessToken);
              localStorage.setItem("refreshToken", refreshData.refreshToken);
              headers["Authorization"] = `Bearer ${refreshData.accessToken}`;
              res = await fetch(`${API_BASE}${path}`, { ...options, headers });
            } else {
              handleSessionExpired();
              return { error: "Session expired" };
            }
          } else {
            handleSessionExpired();
            return { error: "Session expired" };
          }
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const err = body.title || body.detail || `Request failed (${res.status})`;
          setState({ data: null, error: err, loading: false });
          return { error: err };
        }

        const data = res.status === 204 ? (null as T) : await res.json();
        setState({ data, error: null, loading: false });
        return { data };
      } catch {
        const err = "Network error. Is the API running?";
        setState({ data: null, error: err, loading: false });
        return { error: err };
      }
    },
    [],
  );

  return { ...state, fetchApi, setState };
}
