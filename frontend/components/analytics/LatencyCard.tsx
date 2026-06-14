"use client";

import type { LatencyData } from "./data";

interface Props {
  latency: LatencyData;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

const DOT_COLORS: Record<string, string> = {
  "#14b8a6": "#14b8a6",
  "#22c55e": "#22c55e",
  "#eab308": "#eab308",
  "#ef4444": "#ef4444",
};

const BAR_SEGMENTS = [
  { color: "#00694a", flex: 30 },       // green/teal
  { color: "#65dcab", flex: 25 },       // teal-dim
  { color: "#c74e00", flex: 25 },       // orange (primary container)
  { color: "#fce3da", flex: 20 },       // light grey
];

export default function LatencyCard({ latency }: Props) {
  return (
    <div
      style={{
        background: "var(--lumina-surface, #ffffff)",
        borderRadius: "0.75rem",
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.02)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        minHeight: 260,
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.02)";
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.04)";
      }}
    >
      {/* Header with dropdown */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h3
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 18,
            fontWeight: 600,
            lineHeight: "24px",
            color: "#251913",
            margin: 0,
          }}
        >
          System Latency
        </h3>
        <div
          style={{
            background: "#ffe9e1",
            padding: "6px 12px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: "#251913",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#fce3da")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "#ffe9e1")
          }
        >
          This Month
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Large cost + uptime badge */}
      <div style={{ marginBottom: 48, display: "flex", alignItems: "baseline", gap: 16 }}>
        <div
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: "56px",
            letterSpacing: "-0.02em",
            color: "#251913",
          }}
        >
          {formatCurrency(latency.totalCost)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "#00694a",
            background: "rgba(0,105,74,0.08)",
            padding: "4px 10px",
            borderRadius: 9999,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
          {latency.uptimePercent}%
        </div>
      </div>

      {/* 4-column percentile grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {latency.percentiles.slice(0, 4).map((p) => (
          <div key={p.label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
                color: "#251913",
                fontWeight: 700,
                fontSize: 18,
                fontFamily: "'Hanken Grotesk', sans-serif",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: p.color || "#14b8a6",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {p.valueMs}ms
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#594238",
                fontFamily: "'Hanken Grotesk', sans-serif",
              }}
            >
              {p.label} Latency
            </div>
          </div>
        ))}
      </div>

      {/* Multi-color segmented progress bar */}
      <div
        style={{
          height: 48,
          width: "100%",
          borderRadius: 8,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {BAR_SEGMENTS.map((seg, i) => (
          <div
            key={i}
            style={{
              flex: seg.flex,
              height: "100%",
              background: seg.color,
              transition: "flex 0.4s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
