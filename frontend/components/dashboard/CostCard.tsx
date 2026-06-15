"use client";

import { useState } from "react";
import type { CostTrend } from "./metrics-data";

interface Props {
  data: CostTrend;
}

function formatCurrency(val: number): string {
  if (val < 0.01) return val.toFixed(4);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(val);
}

export default function CostCard({ data }: Props) {
  const [hoveredBar, setHoveredBar] = useState<"today" | "yesterday" | null>(null);
  const prefix = data.isPositive ? "+" : "";
  const changeColor = data.isPositive ? "var(--dash-tertiary)" : "var(--dash-error)";
  const barBg = data.isPositive ? "var(--dash-tertiary-fixed)" : "var(--dash-error-bg)";
  const barBorder = data.isPositive ? "var(--dash-tertiary)" : "var(--dash-error)";
  const stripeColor = data.isPositive ? "rgba(0,105,74,0.12)" : "rgba(186,26,26,0.12)";

  return (
    <div
      className="dashboard-card"
      style={{
        background: "var(--dash-surface)",
        borderRadius: "0.75rem",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        minHeight: 260,
        transition: "box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--dash-card-shadow-hover)";
        e.currentTarget.style.borderColor = "var(--dash-card-border-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--dash-card-shadow)";
        e.currentTarget.style.borderColor = "var(--dash-card-border)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 600, lineHeight: "24px", color: "var(--dash-text-secondary)", margin: 0 }}>
            {data.label}
          </h3>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, fontWeight: 400, lineHeight: "20px", color: "var(--dash-text-secondary)", opacity: 0.7, margin: "2px 0 0" }}>
            Overall spending
          </p>
        </div>
        <span style={{ color: "var(--dash-text-secondary)", display: "flex" }}>
          {data.isPositive ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="17" y1="7" x2="7" y2="17" /><polyline points="17 17 7 17 7 7" />
            </svg>
          )}
        </span>
      </div>

      {/* Large overall total */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(36px, 4vw, 48px)", fontWeight: 700, lineHeight: "56px", letterSpacing: "-0.02em", color: "var(--dash-text)" }}>
          {formatCurrency(data.overall)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif", color: changeColor }}>
            {prefix}{data.changePercent}%
          </span>
          <span style={{ fontSize: 12, color: "var(--dash-text-secondary)", fontFamily: "'Hanken Grotesk', sans-serif" }}>
            vs yesterday
          </span>
        </div>
      </div>

      {/* Today / Yesterday comparison bars with hover amounts */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {/* Today */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, lineHeight: "16px", letterSpacing: "0.05em", color: "var(--dash-text-secondary)", marginBottom: 8 }}>
            Today
          </div>
          <div
            style={{
              height: 44,
              borderRadius: 4,
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${stripeColor} 2px, ${stripeColor} 4px)`,
              backgroundColor: barBg,
              border: `1px solid ${barBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={() => setHoveredBar("today")}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: hoveredBar === "today" ? "var(--dash-text)" : "transparent",
              transition: "color 0.15s ease",
              background: hoveredBar === "today" ? "var(--dash-surface)" : "transparent",
              padding: "4px 10px",
              borderRadius: 4,
            }}>
              {formatCurrency(data.today)}
            </span>
          </div>
        </div>
        {/* Yesterday */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, lineHeight: "16px", letterSpacing: "0.05em", color: "var(--dash-text-secondary)", marginBottom: 8 }}>
            Yesterday
          </div>
          <div
            style={{
              height: 44,
              borderRadius: 4,
              background: "var(--dash-surface-high)",
              border: "1px solid var(--dash-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={() => setHoveredBar("yesterday")}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: hoveredBar === "yesterday" ? "var(--dash-text)" : "transparent",
              transition: "color 0.15s ease",
              background: hoveredBar === "yesterday" ? "var(--dash-surface)" : "transparent",
              padding: "4px 10px",
              borderRadius: 4,
            }}>
              {formatCurrency(data.yesterday)}
            </span>
          </div>
        </div>
      </div>

      {/* Divider + Period label */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--dash-border)", paddingTop: 16 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, lineHeight: "16px", letterSpacing: "0.05em", color: "var(--dash-text-secondary)" }}>
          Total All Time
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: "var(--dash-text-secondary)" }}>
          {formatCurrency(data.overall)}
        </span>
      </div>
    </div>
  );
}
