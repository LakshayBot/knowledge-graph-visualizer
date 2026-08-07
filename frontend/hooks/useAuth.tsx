"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";

interface User {
  userId: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: "SET_TOKENS"; payload: { accessToken: string; refreshToken: string } }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

function decodeJwt(token: string): User | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload));
    return {
      userId: json.sub || json.nameidentifier || "",
      username: json.username || "",
      email: json.email || "",
      role: json.role || "User",
    };
  } catch {
    return null;
  }
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, turnstileToken?: string) => Promise<{ error?: string }>;
  register_(
    email: string,
    username: string,
    password: string,
    confirmPassword: string,
    turnstileToken?: string,
  ): Promise<{ error?: string }>;
  logout: () => void;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN": {
      const { user, accessToken, refreshToken } = action.payload;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      return { user, isAuthenticated: true, accessToken, refreshToken, loading: false };
    }
    case "SET_TOKENS":
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case "LOGOUT":
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return { user: null, isAuthenticated: false, accessToken: null, refreshToken: null, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const user = decodeJwt(token);
      if (user) {
        dispatch({
          type: "LOGIN",
          payload: {
            user,
            accessToken: token,
            refreshToken: localStorage.getItem("refreshToken") ?? "",
          },
        });
        return;
      }
    }
    dispatch({ type: "SET_LOADING", payload: false });
  }, []);

  const login = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        dispatch({ type: "SET_LOADING", payload: false });
        return { error: body.title || body.detail || "Invalid credentials" };
      }
      const data = await res.json();
      const user: User = {
        userId: data.userId,
        username: data.username,
        email,
        role: data.role,
      };
      dispatch({
        type: "LOGIN",
        payload: { user, accessToken: data.accessToken, refreshToken: data.refreshToken },
      });
      return {};
    } catch {
      dispatch({ type: "SET_LOADING", payload: false });
      return { error: "Network error. Is the API running?" };
    }
  }, []);

  const register_ = useCallback(
    async (email: string, username: string, password: string, confirmPassword: string, turnstileToken?: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, confirmPassword, turnstileToken }),
        });
        const body = await res.json().catch(() => ({}));
        dispatch({ type: "SET_LOADING", payload: false });
        if (!res.ok) {
          return { error: body.title || body.detail || "Registration failed" };
        }
        return {};
      } catch {
        dispatch({ type: "SET_LOADING", payload: false });
        return { error: "Network error. Is the API running?" };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, []);

  const getAccessToken = useCallback(() => {
    return localStorage.getItem("accessToken");
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register_, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
