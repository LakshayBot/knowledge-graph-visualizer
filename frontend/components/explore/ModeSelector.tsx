"use client";

import { Sparkles } from "lucide-react";

interface Props {
  value: "minimal" | "balanced" | "quality";
  onChange: (v: "minimal" | "balanced" | "quality") => void;
  disabled?: boolean;
}

const MODES = [
  { key: "minimal" as const, label: "Minimal", desc: "3k tokens", color: "var(--chart-2)" },
  { key: "balanced" as const, label: "Balanced", desc: "4k tokens", color: "var(--chart-3)" },
  { key: "quality" as const, label: "Quality", desc: "6k tokens", color: "var(--chart-4)" },
];

export default function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-subtle)",
        borderRadius: "0.5rem",
        border: "1px solid var(--border)",
        padding: "4px",
      }}
    >
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 0 }}>
        {MODES.map((m) => {
          const active = value === m.key;
          return (
            <button
              key={m.key}
              disabled={disabled}
              onClick={() => onChange(m.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: "0.375rem",
                border: active ? "1px solid var(--border)" : "1px solid transparent",
                background: active ? "var(--surface)" : "transparent",
                color: active ? "var(--brand)" : "var(--text-3)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "all 0.15s ease",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "var(--brand)";
                  e.currentTarget.style.background = "var(--surface)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "var(--text-3)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {m.key === "quality" && (
                <Sparkles size={12} style={{ flexShrink: 0 }} />
              )}
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Token info */}
      <span
        style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
          color: "var(--text-4)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          paddingRight: 12,
        }}
      >
        Default ·{" "}
        {value === "minimal" ? "3k" : value === "balanced" ? "4k" : "6k"} Tokens
      </span>
    </div>
  );
}
