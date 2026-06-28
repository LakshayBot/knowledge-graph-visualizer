"use client";

import { useState } from "react";

export type ExploreMode = "explain" | "research" | "debate" | "predict";

interface ModeSelectorBarProps {
  mode: ExploreMode;
  onModeChange: (mode: ExploreMode) => void;
  hasGraph: boolean;
}

const MODES: { key: ExploreMode; label: string; desc: string }[] = [
  { key: "explain", label: "Explain", desc: "Simple causal graph" },
  { key: "research", label: "Research", desc: "Deep exploration" },
  { key: "debate", label: "Debate", desc: "Competing theories" },
  { key: "predict", label: "Predict", desc: "Future simulation" },
];

export default function ModeSelectorBar({ mode, onModeChange, hasGraph }: ModeSelectorBarProps) {
  if (!hasGraph) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: "4px",
        background: "var(--bg-subtle)",
        borderRadius: 8,
        width: "fit-content",
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onModeChange(m.key)}
          title={m.desc}
          style={{
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: mode === m.key ? 700 : 500,
            fontFamily: "'JetBrains Mono', monospace",
            color: mode === m.key ? "var(--text-1)" : "var(--text-3)",
            background: mode === m.key ? "var(--surface)" : "transparent",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all 0.15s",
            boxShadow: mode === m.key ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
