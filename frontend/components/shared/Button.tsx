"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  loading,
  children,
  style,
  disabled,
  ...rest
}: Props) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.01em",
    padding: "11px 22px",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.5 : 1,
    transition: "opacity 0.15s, border-color 0.15s, background 0.15s",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    border: "none",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--accent)",
      color: "var(--accent-fg)",
    },
    outline: {
      background: "transparent",
      color: "var(--text-1)",
      border: "1px solid var(--border-med)",
    },
    danger: {
      background: "#e74c3c",
      color: "#fff",
    },
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {loading && <LoadingSpinner size={14} />}
      {children}
    </button>
  );
}
