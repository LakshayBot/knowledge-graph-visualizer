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
import type { TokenUsageDay } from "./metrics-data";

interface Props {
  data: TokenUsageDay[];
}

type ViewMode = "tokens" | "cost" | "efficiency";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#3c2d27", color: "#ffede7", border: "none", borderRadius: 8, padding: "10px 14px", boxShadow: "0 8px 30px rgba(0,0,0,0.25)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
      <p style={{ margin: 0, fontWeight: 600, marginBottom: 6, color: "#ffede7" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: 0, color: p.color, fontWeight: 600, fontSize: 11 }}>
          {p.name === "total" ? "Total" : p.name === "input" ? "Input" : "Output"}: {(p.value ?? 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function TokenUsageCard({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("tokens");

  const allVals = data.flatMap((d) => [d.input, d.output, d.total]);
  const maxVal = Math.max(...allVals, 1);
  const yMax = Math.ceil(maxVal / 5000) * 5000 || 5000;
  const tickStep = yMax / 4;

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 600, lineHeight: "24px", color: "var(--dash-text)", margin: 0 }}>
            Token Usage
          </h3>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 400, lineHeight: "20px", color: "var(--dash-text-secondary)", margin: "2px 0 0" }}>
            Tokens processed per day
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--dash-primary)", display: "inline-block" }} />
            <span style={{ color: "var(--dash-text-secondary)", fontFamily: "'Hanken Grotesk', sans-serif" }}>Total</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--dash-primary-fixed)", display: "inline-block" }} />
            <span style={{ color: "var(--dash-text-secondary)", fontFamily: "'Hanken Grotesk', sans-serif" }}>Input</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 224, position: "relative", marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-light)" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--dash-text-secondary)", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }} dy={8} />
            <YAxis axisLine={false} tickLine={false} domain={[0, yMax]} ticks={[0, tickStep, tickStep * 2, tickStep * 3, tickStep * 4]} tick={{ fontSize: 10, fill: "var(--dash-text-secondary)", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="input" stroke="var(--dash-primary-fixed)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} connectNulls />
            <Line type="monotone" dataKey="total" stroke="var(--dash-primary)" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "var(--dash-primary)" }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Toggle switches */}
      <div style={{ display: "flex", justifyContent: "center", gap: 32, paddingTop: 16, borderTop: "1px solid var(--dash-border-light)" }}>
        {(["tokens", "cost", "efficiency"] as ViewMode[]).map((m) => (
          <div key={m} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setMode(m)}>
            <span style={{ fontSize: 14, fontWeight: 500, fontFamily: "'Hanken Grotesk', sans-serif", color: mode === m ? "var(--dash-text)" : "var(--dash-text-secondary)", transition: "color 0.2s", textTransform: "capitalize" }}>
              {m === "cost" ? "Cost ($)" : m}
            </span>
            <div style={{ width: 40, height: 20, borderRadius: 9999, background: mode === m ? "var(--dash-primary)" : "var(--dash-surface-high)", position: "relative", transition: "background 0.2s" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: mode === m ? 2 : 22, boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "right 0.2s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
