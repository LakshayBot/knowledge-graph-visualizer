"use client";

import { useState } from "react";
import type { TrafficCategory } from "./metrics-data";

interface Props {
  data: TrafficCategory[];
}

function formatNum(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000 ? `${(n / 1000).toFixed(0)}k`
    : n.toLocaleString();
}

const CATEGORY_COLORS: Record<string, string> = {
  Economics:  "#9f3d00",
  Geopolitics: "#00694a",
  Technology: "#4f6073",
  Healthcare: "#c74e00",
  Climate:    "#00855e",
  General:    "#594238",
};

export default function TrafficCard({ data }: Props) {
  const DISPLAY_COUNT = 6;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? data : data.slice(0, DISPLAY_COUNT);

  if (data.length === 0) {
    return (
      <div style={{ background: "var(--dash-surface-alt)", borderRadius: "0.75rem", padding: "clamp(16px, 3vw, 24px)", height: "100%", transition: "background 0.3s ease" }}>
        <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(16px, 2vw, 18px)", fontWeight: 600, lineHeight: "24px", color: "var(--dash-text)", margin: "0 0 24px" }}>
          Requests by Domain
        </h3>
        <p style={{ fontSize: 13, color: "var(--dash-text-secondary)", textAlign: "center", padding: 40 }}>No data available yet.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--dash-surface-alt)", borderRadius: "0.75rem", padding: "clamp(16px, 3vw, 24px)", height: "100%", transition: "background 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(16px, 3vw, 24px)" }}>
        <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: "clamp(16px, 2vw, 18px)", fontWeight: 600, lineHeight: "24px", color: "var(--dash-text)", margin: 0 }}>
          Requests by Domain
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 1.5vw, 14px)" }}>
        {visible.map((cat) => {
          const barPct = Math.min(cat.percentage, 100);
          const color = CATEGORY_COLORS[cat.category] ?? "var(--dash-primary)";

          return (
            <div key={cat.category} className="traffic-row" style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1.5vw, 12px)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: "clamp(90px, 14vw, 110px)", flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: "clamp(11px, 1.5vw, 14px)", fontWeight: 500, color: "var(--dash-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {cat.category}
                </div>
              </div>

              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--dash-tertiary)", background: "var(--dash-tertiary-fixed)", padding: "2px 6px", borderRadius: 4, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                {cat.percentage}%
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: "clamp(100px, 16vw, 200px)" }}>
                <div style={{ flex: 1, height: 24, borderRadius: 6, background: "var(--dash-surface-high)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${barPct}%`, borderRadius: 6, background: color, opacity: 0.6, transition: "width 0.6s ease" }} className="traffic-bar-fill" />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(10px, 1.2vw, 12px)", fontWeight: 500, letterSpacing: "0.05em", color: "var(--dash-text)", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {formatNum(cat.requests)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.length > DISPLAY_COUNT && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{ width: "100%", marginTop: "clamp(16px, 3vw, 24px)", padding: "12px 0", borderRadius: 8, background: "var(--dash-surface-highest)", border: "none", cursor: "pointer", fontFamily: "Manrope, sans-serif", fontSize: "clamp(14px, 1.8vw, 16px)", fontWeight: 600, color: "var(--dash-text)", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dash-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--dash-surface-highest)")}
        >
          {showAll ? "Show Less" : "View All Domains"}
        </button>
      )}

      <style>{`
        .traffic-row:hover .traffic-bar-fill { opacity: 0.85 !important; }
        @media (max-width: 480px) {
          .traffic-row { flex-direction: column; align-items: flex-start !important; gap: 6px !important; }
        }
      `}</style>
    </div>
  );
}
