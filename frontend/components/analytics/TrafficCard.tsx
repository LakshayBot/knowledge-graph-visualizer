"use client";

import { useState } from "react";
import type { TrafficLocation } from "./data";

interface Props {
  data: TrafficLocation[];
}

// Trend data per country (mock — replace with real API data when available)
const TREND_MAP: Record<string, { change: number }> = {
  "United States": { change: 7 },
  "United Kingdom": { change: -2 },
  Germany: { change: 7 },
  India: { change: 12 },
  Canada: { change: -2 },
  Australia: { change: 9 },
  Japan: { change: 4 },
  Brazil: { change: 15 },
  France: { change: 9 },
};

function formatNum(n: number): string {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(0)}k`
      : n.toLocaleString();
}

export default function TrafficCard({ data }: Props) {
  const DISPLAY_COUNT = 6;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? data : data.slice(0, DISPLAY_COUNT);

  return (
    <div
      style={{
        background: "var(--lumina-surface-container, #ffe9e1)",
        borderRadius: "0.75rem",
        padding: "24px",
        height: "100%",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
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
          Traffic by Location
        </h3>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#594238",
            padding: 4,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#251913")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#594238")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      {/* Location list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {visible.map((loc) => {
          const trend = TREND_MAP[loc.country];
          const trendUp = trend ? trend.change >= 0 : true;
          const trendColor = trendUp ? "#00694a" : "#ba1a1a";
          const trendBg = trendUp
            ? "rgba(0,105,74,0.08)"
            : "rgba(186,26,26,0.08)";
          const barPct = Math.min(loc.percentage, 100);

          return (
            <div
              key={loc.country}
              className="location-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* Flag */}
              <span
                style={{
                  fontSize: 18,
                  lineHeight: 1,
                  flexShrink: 0,
                  width: 24,
                  textAlign: "center",
                }}
              >
                {loc.flag}
              </span>

              {/* Country name */}
              <div
                style={{
                  width: 120,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#251913",
                  flexShrink: 0,
                }}
              >
                {loc.country}
              </div>

              {/* Trend chip */}
              {trend && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    fontSize: 10,
                    fontWeight: 600,
                    color: trendColor,
                    background: trendBg,
                    padding: "2px 6px",
                    borderRadius: 4,
                    flexShrink: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {trendUp ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  )}
                  {trendUp ? "+" : ""}{trend.change}%
                </div>
              )}

              {/* Progress bar */}
              <div
                style={{
                  flex: 1,
                  height: 24,
                  borderRadius: 6,
                  background: "#fce3da",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barPct}%`,
                    borderRadius: 6,
                    background: "#f6ded4",
                    transition: "width 0.6s ease, background 0.3s ease",
                  }}
                  className="loc-bar-fill"
                />
              </div>

              {/* Request count */}
              <div
                style={{
                  width: 64,
                  textAlign: "right",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  color: "#251913",
                  flexShrink: 0,
                }}
              >
                {formatNum(loc.requests)}
              </div>
            </div>
          );
        })}
      </div>

      {/* View All button */}
      {data.length > DISPLAY_COUNT && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: "100%",
            marginTop: 24,
            padding: "12px 0",
            borderRadius: 8,
            background: "#f6ded4",
            border: "none",
            cursor: "pointer",
            fontFamily: "Manrope, sans-serif",
            fontSize: 18,
            fontWeight: 600,
            lineHeight: "24px",
            color: "#251913",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(224,192,179,0.5)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "#f6ded4")
          }
        >
          {showAll ? "Show Less" : "View All Locations"}
        </button>
      )}

      {/* Hover style for progress bars */}
      <style>{`
        .location-row:hover .loc-bar-fill {
          background: #ffb596 !important;
        }
      `}</style>
    </div>
  );
}
