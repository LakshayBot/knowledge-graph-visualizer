"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrafficLocation } from "./data";

interface Props {
  data: TrafficLocation[];
}

export default function TrafficCard({ data }: Props) {
  const total = data.reduce((s, d) => s + d.requests, 0);

  return (
    <Card
      className="border-0 shadow-xs"
      style={{
        borderRadius: 12,
        background: "linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fdba74 100%)",
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle
          className="text-sm font-medium"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          Traffic by Location
        </CardTitle>
        <div className="mt-1">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#fff" }}
          >
            {total.toLocaleString()}
          </span>
          <span
            className="ml-2 text-xs"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            requests
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                <span style={{ fontSize: 14, lineHeight: 1 }}>{loc.flag}</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.95)",
                  }}
                >
                  {loc.country}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {(loc.requests / 1000).toFixed(0)}k
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.15)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${loc.percentage}%`,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.7)",
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
