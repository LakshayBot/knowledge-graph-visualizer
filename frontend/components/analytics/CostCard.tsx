"use client";

import type { CostTrend } from "./data";

interface Props {
  data: CostTrend;
}

function formatCurrency(val: number): string {
  const digits = val < 1 ? 4 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(val);
}

export default function CostCard({ data }: Props) {
  const prefix = data.isPositive ? "+" : "";
  const changeColor = data.isPositive ? "#00694a" : "#ba1a1a";
  const accentBg = data.isPositive
    ? "rgba(0,105,74,0.08)"
    : "rgba(186,26,26,0.08)";
  const barBg = data.isPositive ? "#82f9c6" : "#ffdad6";
  const barBorder = data.isPositive ? "#00694a" : "#ba1a1a";
  const maxVal = Math.max(data.current, data.previous, 1);
  const currentPct = (data.current / maxVal) * 100;
  const previousPct = (data.previous / maxVal) * 100;

  return (
    <div
      className="analytics-card"
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
      {/* Header: Title + Arrow */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 18,
              fontWeight: 600,
              lineHeight: "24px",
              color: "#594238",
              margin: 0,
            }}
          >
            {data.label}
          </h3>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              lineHeight: "20px",
              color: "rgba(89,66,56,0.7)",
              margin: "2px 0 0",
            }}
          >
            This week
          </p>
        </div>
        {/* Arrow icon */}
        <span
          style={{
            color: "#594238",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {data.isPositive ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="17" y1="7" x2="7" y2="17" />
              <polyline points="17 17 7 17 7 7" />
            </svg>
          )}
        </span>
      </div>

      {/* Large Percentage */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: "56px",
            letterSpacing: "-0.02em",
            color: changeColor,
          }}
        >
          {prefix}{data.changePercent}%
        </div>
      </div>

      {/* Current / Previous Comparison Bars */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {/* Current */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 500,
              lineHeight: "16px",
              letterSpacing: "0.05em",
              color: "#594238",
              marginBottom: 8,
            }}
          >
            Current
          </div>
          <div
            style={{
              height: 40,
              borderRadius: 4,
              background: barBg,
              border: `1px solid ${barBorder}`,
              display: "flex",
              alignItems: "center",
              paddingLeft: 10,
            }}
          >
            <div
              style={{
                height: "60%",
                width: `${Math.min(currentPct, 100)}%`,
                borderRadius: 3,
                background: barBorder,
                opacity: 0.2,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
        {/* Previous */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 500,
              lineHeight: "16px",
              letterSpacing: "0.05em",
              color: "#594238",
              marginBottom: 8,
            }}
          >
            Previous
          </div>
          <div
            style={{
              height: 40,
              borderRadius: 4,
              background: "#fce3da",
              border: "1px solid #e0c0b3",
              display: "flex",
              alignItems: "center",
              paddingLeft: 10,
            }}
          >
            <div
              style={{
                height: "60%",
                width: `${Math.min(previousPct, 100)}%`,
                borderRadius: 3,
                background: "#e0c0b3",
                opacity: 0.5,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Divider + Total Volume */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderTop: "1px solid #e0c0b3",
          paddingTop: 16,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: "16px",
            letterSpacing: "0.05em",
            color: "#594238",
          }}
        >
          Total Volume
        </span>
        <span
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 18,
            fontWeight: 600,
            lineHeight: "24px",
            color: "#251913",
          }}
        >
          {formatCurrency(data.current)}
        </span>
      </div>
    </div>
  );
}
