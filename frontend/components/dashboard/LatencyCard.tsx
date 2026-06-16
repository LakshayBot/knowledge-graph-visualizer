"use client";

import type { LatencyData } from "./metrics-data";

interface Props {
  latency: LatencyData;
}

const BAR_SEGMENTS = [
  { color: "var(--dash-tertiary)", flex: 30 },
  { color: "#65dcab", flex: 25 },
  { color: "var(--dash-primary)", flex: 25 },
  { color: "var(--dash-surface-high)", flex: 20 },
];

export default function LatencyCard({ latency }: Props) {
  return (
    <div
      style={{
        background: "var(--dash-surface)",
        borderRadius: "0.75rem",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
        padding: "24px",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 600, lineHeight: "24px", color: "var(--dash-text)", margin: 0 }}>
          System Latency
        </h3>
        <div style={{ background: "var(--dash-surface-alt)", padding: "6px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", color: "var(--dash-text)", transition: "background 0.2s" }}>
          This Month
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Avg latency + uptime */}
      <div style={{ marginBottom: 48, display: "flex", alignItems: "baseline", gap: 16 }}>
        <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 48, fontWeight: 700, lineHeight: "56px", letterSpacing: "-0.02em", color: "var(--dash-text)" }}>
          {latency.avgMs > 0 ? `${latency.avgMs}ms` : "--"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#00694a", background: "rgba(0,105,74,0.08)", padding: "4px 10px", borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: "'Hanken Grotesk', sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
          </svg>
          {latency.uptimePercent}%
        </div>
      </div>

      {/* Percentile grid */}
      <div className="latency-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
        {latency.percentiles.length > 0 ? latency.percentiles.slice(0, 4).map((p) => (
          <div key={p.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--dash-text)", fontWeight: 700, fontSize: 18, fontFamily: "'Hanken Grotesk', sans-serif" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />
              {p.valueMs}ms
            </div>
            <div style={{ fontSize: 12, color: "var(--dash-text-secondary)", fontFamily: "'Hanken Grotesk', sans-serif" }}>{p.label} Latency</div>
          </div>
        )) : (
          <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "var(--dash-text-secondary)", padding: "20px 0" }}>No latency data recorded yet.</div>
        )}
      </div>

      {/* Segmented progress bar */}
      <div style={{ height: 48, width: "100%", borderRadius: 8, display: "flex", overflow: "hidden" }}>
        {BAR_SEGMENTS.map((seg, i) => (
          <div key={i} style={{ flex: seg.flex, height: "100%", background: seg.color, transition: "flex 0.4s ease" }} />
        ))}
      </div>

      <style>{`
        @media (min-width: 640px) { .latency-grid { grid-template-columns: repeat(4, 1fr) !important; } }
      `}</style>
    </div>
  );
}
