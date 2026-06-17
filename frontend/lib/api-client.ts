const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

/** Redirect to login and clear session. Exported so tests/other code can call it directly. */
export function handleSessionExpired() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  // Only redirect if we're in a browser and not already on the login page
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login?expired=1";
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Set to false to skip attaching the Authorization header */
  auth?: boolean;
  /** AI provider name — sent as X-Provider header for BYOK key resolution */
  provider?: string;
  /** AI model name — sent as X-Model header */
  model?: string;
}

/**
 * Thin wrapper around native `fetch` that:
 * 1. Automatically attaches the Bearer token from localStorage
 * 2. On 401, attempts a one-shot token refresh via /auth/refresh
 * 3. Retries the original request with the new token
 * 4. On refresh failure, clears session and redirects to /login?expired=1
 *
 * Can be used anywhere — inside React hooks, plain utility functions, or server components.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (options.auth !== false) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // Forward AI provider/model as headers for BYOK key resolution
  if (options.provider) headers["X-Provider"] = options.provider;
  if (options.model) headers["X-Model"] = options.model;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // ── 401 → attempt token refresh ──
  if (res.status === 401 && options.auth !== false) {
    const rt =
      typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
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
        // retry original request once with the new token
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      } else {
        handleSessionExpired();
        throw new Error("Session expired — redirecting to login");
      }
    } else {
      handleSessionExpired();
      throw new Error("Session expired — redirecting to login");
    }
  }

  // ── Still not OK after potential retry ──
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body.title || body.detail || `Request failed (${res.status})`;
    throw new Error(message);
  }

  // ── 204 No Content ──
  if (res.status === 204) return null as T;

  return res.json();
}
