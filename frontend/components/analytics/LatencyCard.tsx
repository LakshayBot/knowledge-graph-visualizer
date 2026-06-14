"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LatencyMetric } from "./data";

interface Props {
  data: LatencyMetric[];
}

export default function LatencyCard({ data }: Props) {
  const pct = 99.97;
  const statusColor = pct >= 99.9 ? "#22c55e" : pct >= 99.5 ? "#eab308" : "#ef4444";

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          System Latency
        </CardTitle>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight">99.97%</span>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            uptime
          </span>
          <span
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: statusColor }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
              }}
            />
            Operational
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {data.map((m) => {
            const dotColor =
              m.status === "good"
                ? "#22c55e"
                : m.status === "warning"
                  ? "#eab308"
                  : "#ef4444";
            return (
              <div
                key={m.label}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-subtle)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: dotColor,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-3)",
                    }}
                  >
                    {m.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--text-1)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {m.value}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-4)",
                    marginLeft: 4,
                    fontWeight: 500,
                  }}
                >
                  {m.unit}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
