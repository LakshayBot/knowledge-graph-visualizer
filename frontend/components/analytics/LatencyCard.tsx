"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LatencyData, CostTrend } from "./data";

interface Props {
  latency: LatencyData;
  costs: CostTrend[];
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export default function LatencyCard({ latency, costs }: Props) {
  const totalCost = costs.reduce((s, c) => s + c.current, 0);

  return (
    <Card className="border-border/60 shadow-xs" style={{ borderRadius: 12 }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          System Latency & Cost
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Top half: total cost + green pill */}
        <div className="mb-5 flex items-baseline gap-3">
          <span className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-1)", letterSpacing: "-0.04em" }}>
            {formatCurrency(totalCost)}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              color: "#22c55e",
              background: "rgba(34,197,94,0.1)",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            +{latency.uptimePercent}%
          </span>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            uptime
          </span>
        </div>

        {/* Bottom half: continuous segmented horizontal bar */}
        <div>
          <div
            style={{
              display: "flex",
              height: 28,
              borderRadius: 8,
              overflow: "hidden",
              gap: 2,
            }}
          >
            {latency.percentiles.map((p) => {
              const maxVal = Math.max(...latency.percentiles.map((x) => x.valueMs));
              const widthPct = (p.valueMs / maxVal) * 100;
              return (
                <div
                  key={p.label}
                  style={{
                    flex: widthPct,
                    height: "100%",
                    borderRadius: 6,
                    background: p.color,
                    opacity: 0.75,
                    position: "relative",
                    minWidth: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.valueMs}ms
                  </span>
                </div>
              );
            })}
          </div>
          {/* Labels below the bar */}
          <div
            style={{
              display: "flex",
              marginTop: 6,
            }}
          >
            {latency.percentiles.map((p) => {
              const maxVal = Math.max(...latency.percentiles.map((x) => x.valueMs));
              const widthPct = (p.valueMs / maxVal) * 100;
              return (
                <div
                  key={p.label}
                  style={{
                    flex: widthPct,
                    minWidth: 40,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-3)",
                    }}
                  >
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
