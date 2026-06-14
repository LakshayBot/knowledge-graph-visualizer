"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrafficLocation } from "./data";

interface Props {
  data: TrafficLocation[];
}

export default function TrafficCard({ data }: Props) {
  const total = data.reduce((s, d) => s + d.requests, 0);

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Traffic by Location
        </CardTitle>
        <div className="mt-1">
          <span className="text-2xl font-bold tracking-tight">
            {total.toLocaleString()}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">requests</span>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map((loc) => (
            <div key={loc.country}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{loc.flag}</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-1)",
                  }}
                >
                  {loc.country}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {(loc.requests / 1000).toFixed(0)}k
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${loc.percentage}%`,
                    borderRadius: 2,
                    background: "var(--text-1)",
                    opacity: 0.4 + loc.percentage / 100,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
