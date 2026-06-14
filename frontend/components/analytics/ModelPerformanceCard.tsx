"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelPerformance } from "./data";

interface Props {
  data: ModelPerformance[];
}

/** Map a score (70-99) to an orange opacity */
function scoreOpacity(score: number): number {
  // 70 → 0.1,  80 → 0.3,  90 → 0.6,  99 → 0.95
  return 0.05 + (score - 70) / 29 * 0.9;
}

export default function ModelPerformanceCard({ data }: Props) {
  // All 12 months
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Card className="border-border/60 shadow-xs" style={{ borderRadius: 12 }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Model Performance
          </CardTitle>
          {/* Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fb923c", opacity: 0.2, display: "inline-block" }} />
              <span style={{ fontSize: 9, color: "var(--text-4)" }}>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fb923c", opacity: 0.6, display: "inline-block" }} />
              <span style={{ fontSize: 9, color: "var(--text-4)" }}>Avg</span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fb923c", opacity: 0.95, display: "inline-block" }} />
              <span style={{ fontSize: 9, color: "var(--text-4)" }}>High</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `90px repeat(${months.length}, 1fr)`,
            gap: 3,
            alignItems: "center",
          }}
        >
          {/* Header row */}
          <div />
          {months.map((m) => (
            <div
              key={m}
              style={{
                textAlign: "center",
                fontSize: 9,
                fontWeight: 600,
                color: "var(--text-4)",
                paddingBottom: 4,
              }}
            >
              {m}
            </div>
          ))}

          {/* Model rows */}
          {data.map((model) => {
            const scoresByMonth = new Map(model.monthlyScores.map((s) => [s.month, s.score]));
            return (
              <>
                {/* Model label */}
                <div
                  key={model.model}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-1)",
                    paddingRight: 8,
                    whiteSpace: "nowrap",
                  }}
                >
                  {model.model}
                </div>

                {/* Score cells */}
                {months.map((month) => {
                  const score = scoresByMonth.get(month) ?? 85;
                  const opacity = scoreOpacity(score);
                  return (
                    <div
                      key={`${model.model}-${month}`}
                      title={`${model.model} · ${month}: ${score}`}
                      style={{
                        aspectRatio: "1",
                        borderRadius: 4,
                        background: `rgba(251, 146, 60, ${opacity})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: score >= 90 ? "#fff" : "rgba(0,0,0,0.5)",
                        transition: "transform 0.15s, box-shadow 0.15s",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.15)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {score}
                    </div>
                  );
                })}
              </>
            );
          })}
        </div>

        {/* Bottom legend rows */}
        <div
          className="mt-4 flex items-center gap-6 text-xs"
          style={{ color: "var(--text-4)" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ width: 12, height: 3, borderRadius: 2, background: "var(--text-3)", opacity: 0.3, display: "inline-block" }} />
            Benchmark
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 12, height: 3, borderRadius: 2, background: "#fb923c", opacity: 0.5, display: "inline-block" }} />
            Industry Avg
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 12, height: 3, borderRadius: 2, background: "#fb923c", opacity: 0.9, display: "inline-block" }} />
            Your Models
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
