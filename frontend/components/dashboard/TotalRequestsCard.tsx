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
import type { DailyRequest } from "./metrics-data";

interface Props {
  data: DailyRequest[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div style={{ background: "#3c2d27", color: "#ffede7", border: "none", borderRadius: 8, padding: "10px 14px", boxShadow: "0 8px 30px rgba(0,0,0,0.25)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
      <span style={{ color: "rgba(255,237,231,0.7)", fontSize: 10, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontWeight: 700, color: "#fff" }}>{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}</span>
    </div>
  );
}

export default function TotalRequestsCard({ data }: Props) {
  const maxVal = Math.max(...data.map((d) => d.requests), 1);

  // Dynamic y-axis — adapt to the actual data range
  let yMax: number;
  let step: number;
  if (maxVal <= 5) {
    yMax = maxVal + 1;
    step = Math.max(1, Math.ceil(yMax / 4));
  } else if (maxVal <= 20) {
    yMax = Math.ceil(maxVal / 5) * 5 || 5;
    step = Math.max(1, Math.round(yMax / 4));
  } else if (maxVal <= 100) {
    yMax = Math.ceil(maxVal / 10) * 10;
    step = Math.round(yMax / 4 / 10) * 10 || 10;
  } else if (maxVal <= 1000) {
    yMax = Math.ceil(maxVal / 100) * 100;
    step = Math.round(yMax / 4 / 100) * 100 || 100;
  } else {
    yMax = Math.ceil(maxVal / 1000) * 1000;
    step = 1000;
  }

  // Build tick array from 0 to yMax
  const ticks: number[] = [];
  for (let t = 0; t <= yMax; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] < yMax) ticks.push(yMax);

  // Show fewer x-axis labels to avoid crowding
  const showAllLabels = data.length <= 14;
  const xTickGap = showAllLabels ? 1 : Math.ceil(data.length / 7);

  return (
    <div
      style={{
        background: "var(--dash-surface)",
        borderRadius: "0.75rem",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 260,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--dash-card-shadow-hover)";
        e.currentTarget.style.borderColor = "var(--dash-card-border-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--dash-card-shadow)";
        e.currentTarget.style.borderColor = "var(--dash-card-border)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 600, lineHeight: "24px", color: "var(--dash-text-secondary)", margin: 0 }}>
            Total Requests
          </h3>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 400, lineHeight: "20px", color: "var(--dash-text-secondary)", opacity: 0.7, margin: "2px 0 0" }}>
            Daily requests (last 30 days)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, color: "var(--dash-text-secondary)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 200, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-light)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              interval={xTickGap - 1}
              tick={{ fontSize: 10, fill: "var(--dash-text-secondary)", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={[0, yMax]}
              ticks={ticks}
              width={40}
              tick={{ fontSize: 10, fill: "var(--dash-text-secondary)", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--dash-border-light)" }} />
            <Bar dataKey="requests" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {data.map((entry) => (
                <Cell key={entry.date} fill={entry.requests === maxVal ? "var(--dash-primary)" : "var(--dash-primary-fixed)"} fillOpacity={entry.requests === maxVal ? 0.9 : 0.35} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="requests" stroke="var(--dash-primary)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
