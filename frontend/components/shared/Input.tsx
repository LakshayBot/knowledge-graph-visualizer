"use client";

import { type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({ label, error, style, ...rest }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "var(--text-4)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <input
        {...rest}
        style={{
          background: "var(--surface)",
          border: `1.5px solid ${error ? "#e74c3c" : "var(--border-med)"}`,
          color: "var(--text-1)",
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          padding: "11px 14px",
          outline: "none",
          width: "100%",
          transition: "border-color 0.15s",
          fontFamily: "inherit",
          ...style,
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = "var(--text-1)";
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = "var(--border-med)";
        }}
      />
      {error && (
        <span style={{ fontSize: 10, color: "#e74c3c", fontWeight: 600, letterSpacing: "0.03em" }}>
          {error}
        </span>
      )}
    </div>
  );
}
