"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CostTrend } from "./data";

interface Props {
  data: CostTrend;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export default function CostCard({ data }: Props) {
  const prefix = data.isPositive ? "+" : "";
  const arrow = data.isPositive ? "▲" : "▼";
  const changeColor = data.isPositive ? "#22c55e" : "#ef4444";
  const maxVal = Math.max(data.current, data.previous);
  const currentPct = (data.current / maxVal) * 100;
  const previousPct = (data.previous / maxVal) * 100;

  return (
    <Card className="border-border/60 shadow-xs" style={{ borderRadius: 12 }}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
          {data.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Primary: percentage change — large */}
        <div className="mb-3 flex items-baseline gap-2">
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: changeColor,
              lineHeight: 1,
            }}
          >
            {arrow} {prefix}{data.changePercent}%
          </span>
        </div>

        {/* Soft pastel progress blocks */}
        <div className="space-y-3">
          {/* Current */}
          <div>
            <div
              className="mb-1 flex items-center justify-between text-xs"
              style={{ color: "var(--text-3)" }}
            >
              <span>Current</span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>
                {formatCurrency(data.current)}
              </span>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 6,
                background: "rgba(34,197,94,0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${currentPct}%`,
                  borderRadius: 6,
                  background: "#22c55e",
                  opacity: 0.7,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>

          {/* Previous */}
          <div>
            <div
              className="mb-1 flex items-center justify-between text-xs"
              style={{ color: "var(--text-3)" }}
            >
              <span>Previous</span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>
                {formatCurrency(data.previous)}
              </span>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 6,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${previousPct}%`,
                  borderRadius: 6,
                  background: "var(--text-3)",
                  opacity: 0.3,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
