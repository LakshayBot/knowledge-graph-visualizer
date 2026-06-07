"use client";

interface Props {
  value: "minimal" | "balanced" | "quality";
  onChange: (v: "minimal" | "balanced" | "quality") => void;
  disabled?: boolean;
}

const MODES = [
  { key: "minimal" as const, label: "Minimal", desc: "Fast · 3k tokens", color: "#4ade80" },
  { key: "balanced" as const, label: "Balanced", desc: "Default · 4k tokens", color: "#38bdf8" },
  { key: "quality" as const, label: "Quality", desc: "Deep · 6k tokens", color: "#c084fc" },
];

export default function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {MODES.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            disabled={disabled}
            onClick={() => onChange(m.key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "10px 12px",
              background: active ? "var(--surface)" : "transparent",
              border: `1px solid ${active ? "var(--border-med)" : "var(--border)"}`,
              cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
              opacity: disabled ? 0.5 : 1,
              marginLeft: -1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: m.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: active ? "var(--text-1)" : "var(--text-3)",
                  letterSpacing: "-0.02em",
                  transition: "color 0.15s",
                }}
              >
                {m.label}
              </span>
            </div>
            <span
              style={{
                fontSize: 8,
                fontWeight: 600,
                color: "var(--text-4)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {m.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
