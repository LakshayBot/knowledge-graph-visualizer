"use client";

import { type KeyboardEvent } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}

export default function SearchBar({ value, onChange, onSubmit, loading }: Props) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div style={{ display: "flex", gap: 0, width: "100%" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a causal question... (e.g. Why is the rupee falling?)"
        disabled={loading}
        style={{
          flex: 1,
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRight: "none",
          borderRadius: "0.5rem 0 0 0.5rem",
          color: "var(--text-1)",
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          padding: "14px 18px",
          outline: "none",
          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--brand)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      />
      <button
        onClick={onSubmit}
        disabled={loading || !value.trim()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background:
            loading || !value.trim() ? "var(--border-med)" : "var(--brand)",
          color:
            loading || !value.trim() ? "var(--text-4)" : "var(--brand-fg)",
          border: "1.5px solid transparent",
          borderRadius: "0 0.5rem 0.5rem 0",
          padding: "0 24px",
          cursor: loading || !value.trim() ? "not-allowed" : "pointer",
          fontFamily: "'Manrope', system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.02em",
          transition: "background 0.15s, color 0.15s, opacity 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? (
          <>
            <div
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            Thinking
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Search
          </>
        )}
      </button>
    </div>
  );
}
