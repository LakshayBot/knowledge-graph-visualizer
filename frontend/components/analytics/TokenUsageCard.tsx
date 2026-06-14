"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TokenUsageDay } from "./data";

interface Props {
  data: TokenUsageDay[];
}

type ViewMode = "tokens" | "cost" | "efficiency";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "#111",
        color: "#f5f2ec",
        border: "none",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
        fontSize: 12,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, marginBottom: 4, color: "#f5f2ec" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: 0, color: p.color, fontWeight: 600 }}>
          {p.name === "total" ? "Total" : p.name === "input" ? "Input" : "Output"}: {(p.value ?? 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

const TABS: { key: ViewMode; label: string }[] = [
  { key: "tokens", label: "Tokens" },
  { key: "cost", label: "Cost" },
  { key: "efficiency", label: "Efficiency" },
];

export default function TokenUsageCard({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("tokens");

  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card className="border-border/60 shadow-xs" style={{ borderRadius: 12 }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Token Usage
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#fb923c", display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>Input</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#fdba74", display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>Output</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ea580c", display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>Total</span>
            </div>
          </div>
        </div>
        <div className="mt-0">
          <span className="text-2xl font-bold tracking-tight">
            {total.toLocaleString()}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">tokens / week</span>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 180, marginBottom: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-3)", fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-3)", fontWeight: 500 }}
                tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              {mode === "tokens" && (
                <>
                  <Line
                    type="linear"
                    dataKey="input"
                    stroke="#fb923c"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#fb923c" }}
                    connectNulls
                  />
                  <Line
                    type="linear"
                    dataKey="output"
                    stroke="#fdba74"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#fdba74" }}
                    connectNulls
                  />
                  <Line
                    type="linear"
                    dataKey="total"
                    stroke="#ea580c"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "#ea580c" }}
                    connectNulls
                  />
                </>
              )}
              {mode === "cost" && (
                <Line
                  type="linear"
                  dataKey="total"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              )}
              {mode === "efficiency" && (
                <Line
                  type="linear"
                  dataKey="output"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Toggle switches */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "2px",
            borderRadius: 8,
            background: "var(--bg-subtle)",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              style={{
                flex: 1,
                padding: "6px 0",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "inherit",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: mode === tab.key ? "var(--surface)" : "transparent",
                color: mode === tab.key ? "var(--text-1)" : "var(--text-3)",
                boxShadow: mode === tab.key ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
