"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Line,
  Cell,
} from "recharts";
import type { MonthlyRequest } from "./data";

interface Props {
  data: MonthlyRequest[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value ?? 0;
  const pctChange = "+12.4%"; // would be computed from real data
  return (
    <div
      style={{
        background: "#3c2d27",
        color: "#ffede7",
        border: "none",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "rgba(255,237,231,0.7)", fontSize: 10, textTransform: "uppercase" }}>
        Total Requests
      </span>
      <span style={{ fontWeight: 700, color: "#fff" }}>
        {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
      </span>
      <span
        style={{
          color: "#82f9c6",
          background: "rgba(130,249,198,0.15)",
          padding: "1px 4px",
          borderRadius: 3,
          fontSize: 10,
        }}
      >
        {pctChange}
      </span>
    </div>
  );
}

export default function TotalRequestsCard({ data }: Props) {
  const maxVal = Math.max(...data.map((d) => d.requests), 1);

  // Compute a nice ceiling for the Y axis
  const yMax = Math.ceil(maxVal / 8000) * 8000;
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <div
      style={{
        background: "var(--lumina-surface, #ffffff)",
        borderRadius: "0.75rem",
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.02)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 260,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.02)";
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.04)";
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 18,
              fontWeight: 600,
              lineHeight: "24px",
              color: "#594238",
              margin: 0,
            }}
          >
            Total Requests
          </h3>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              lineHeight: "20px",
              color: "rgba(89,66,56,0.7)",
              margin: "2px 0 0",
            }}
          >
            During this month
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, color: "#594238" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 200, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(224,192,179,0.4)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "#594238",
                fontWeight: 500,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={[0, yMax]}
              ticks={ticks}
              tick={{
                fontSize: 10,
                fill: "#594238",
                fontWeight: 500,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(224,192,179,0.25)" }} />
            <Bar dataKey="requests" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.requests === maxVal ? "#9f3d00" : "#ffb596"}
                  fillOpacity={entry.requests === maxVal ? 0.9 : 0.35}
                />
              ))}
            </Bar>
            {/* Dashed trend line overlay */}
            <Line
              type="monotone"
              dataKey="requests"
              stroke="#9f3d00"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
