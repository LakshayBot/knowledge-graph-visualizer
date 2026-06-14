"use client";

import {
  AreaChart,
  Area,
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
          {p.name}: {(p.value ?? 0).toLocaleString()} tokens
        </p>
      ))}
    </div>
  );
}

export default function TokenUsageCard({ data }: Props) {
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Token Usage
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--text-1)", display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>Input</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>Output</span>
            </div>
          </div>
        </div>
        <div className="mt-1">
          <span className="text-2xl font-bold tracking-tight">
            {total.toLocaleString()}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">tokens / week</span>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--text-1)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--text-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="input"
                stroke="var(--text-1)"
                strokeWidth={2}
                fill="url(#inputGrad)"
              />
              <Area
                type="monotone"
                dataKey="output"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#outputGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
