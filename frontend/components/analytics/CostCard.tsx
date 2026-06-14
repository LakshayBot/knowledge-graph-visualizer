"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CostData } from "./data";

interface Props {
  data: CostData;
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
  const maxVal = Math.max(data.current, data.previous);
  const currentPct = (data.current / maxVal) * 100;
  const previousPct = (data.previous / maxVal) * 100;
  const prefix = data.isPositive ? "+" : "";
  const changeColor = data.isPositive ? "#22c55e" : "#ef4444";

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {data.label}
          </CardTitle>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              color: changeColor,
              background: data.isPositive
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {data.isPositive ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {prefix}{data.change}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(data.current)}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">/mo</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-3)" }}>Current</span>
              <span className="font-medium tabular-nums">{formatCurrency(data.current)}</span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${currentPct}%`,
                  borderRadius: 3,
                  background: "var(--text-1)",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-3)" }}>Previous</span>
              <span className="font-medium tabular-nums">{formatCurrency(data.previous)}</span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${previousPct}%`,
                  borderRadius: 3,
                  background: "var(--text-3)",
                  opacity: 0.5,
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
