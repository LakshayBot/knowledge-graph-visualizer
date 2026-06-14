"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelPerformance } from "./data";

interface Props {
  data: ModelPerformance[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0]?.payload;
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
        minWidth: 140,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, marginBottom: 6, color: "#f5f2ec" }}>
        {label}
      </p>
      {entry && (
        <>
          <p style={{ margin: 0, color: "#22c55e", fontWeight: 600 }}>
            Accuracy: {entry.accuracy}%
          </p>
          <p style={{ margin: 0, color: "#eab308", fontWeight: 600 }}>
            Latency: {entry.latency}ms
          </p>
          <p style={{ margin: 0, color: "var(--text-3)", fontWeight: 500, marginTop: 2 }}>
            {(entry.calls / 1000).toFixed(1)}k calls
          </p>
        </>
      )}
    </div>
  );
}

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#eab308", "#ec4899"];

export default function ModelPerformanceCard({ data }: Props) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Model Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
              barSize={18}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-3)", fontWeight: 500 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="model"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-1)", fontWeight: 600 }}
                width={72}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--border)", opacity: 0.2 }} />
              <Bar
                dataKey="accuracy"
                radius={[0, 4, 4, 0]}
                style={{ cursor: "pointer" }}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
