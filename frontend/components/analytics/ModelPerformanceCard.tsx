"use client";

import type { ModelPerformance } from "./data";

interface Props {
  data: ModelPerformance[];
}

/** Map a score (70-99) to opacity for the heatmap cells */
function scoreOpacity(score: number): number {
  // 70 → 0.08,  80 → 0.25,  85 → 0.4,  90 → 0.6,  95 → 0.8,  99 → 0.95
  return 0.05 + ((score - 68) / 31) * 0.9;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ModelPerformanceCard({ data }: Props) {
  return (
    <div
      style={{
        background: "var(--lumina-surface, #ffffff)",
        borderRadius: "0.75rem",
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.02)",
        padding: "24px",
        height: "100%",
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
      {/* Header */}
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
              color: "#251913",
              margin: 0,
            }}
          >
            Model Performance
          </h3>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              lineHeight: "20px",
              color: "#594238",
              margin: "2px 0 0",
            }}
          >
            Accuracy scores vs Industry Benchmarks
          </p>
        </div>
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
          Monthly
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div style={{ display: "flex", marginBottom: 24 }}>
        {/* Y-axis: Model labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingTop: 2,
            paddingBottom: 2,
            paddingRight: 16,
            gap: 16,
            width: 88,
            flexShrink: 0,
          }}
        >
          {data.map((model) => (
            <div
              key={model.model}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#594238",
                fontFamily: "'Hanken Grotesk', sans-serif",
                height: 24,
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {model.model}
            </div>
          ))}
        </div>

        {/* Grid cells + month headers */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(12, 1fr)`, gap: "4px 4px", rowGap: 16 }}>
          {data.map((model) => {
            const scoresByMonth = new Map(
              model.monthlyScores.map((s) => [s.month, s.score])
            );
            return MONTHS.map((month) => {
              const score = scoresByMonth.get(month) ?? 85;
              const opacity = scoreOpacity(score);
              const isDarker = score >= 90;
              return (
                <div
                  key={`${model.model}-${month}`}
                  title={`${model.model} · ${month}: ${score}`}
                  style={{
                    height: 24,
                    borderRadius: 4,
                    background: `rgba(159,61,0,${opacity.toFixed(2)})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isDarker
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(37,25,19,0.6)",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                    opacity: 0.85,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.2)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.15)";
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.opacity = "0.85";
                  }}
                >
                  {score}
                </div>
              );
            });
          })}

          {/* Month labels row */}
          {MONTHS.map((m) => (
            <div
              key={`hdr-${m}`}
              style={{
                gridColumn: "span 1",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 500,
                color: "#594238",
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 2,
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          paddingTop: 16,
          borderTop: "1px solid rgba(224,192,179,0.3)",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: "#9f3d00",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#594238", fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Benchmark
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: "#9f3d00",
              opacity: 0.5,
              display: "inline-block",
            }}
          />
          <span style={{ color: "#594238", fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Industry Avg
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: "#fce3da",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#594238", fontFamily: "'Hanken Grotesk', sans-serif" }}>
            Your Models
          </span>
        </div>
      </div>
    </div>
  );
}
