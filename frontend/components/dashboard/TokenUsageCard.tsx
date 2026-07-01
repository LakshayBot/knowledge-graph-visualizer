"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import type { TokenUsageDay, ModelTokenUsage } from "./metrics-data";

interface Props {
  data: TokenUsageDay[];
  modelTokenUsage: ModelTokenUsage[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TokenUsageDay }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--dash-text)",
      color: "#fff8f6",
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.date}</div>
      <div>Input:  {d.input.toLocaleString()}</div>
      <div>Output: {d.output.toLocaleString()}</div>
      <div>Total:  {d.total.toLocaleString()}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "4px 28px 4px 10px",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "'JetBrains Mono', monospace",
  color: "var(--dash-text)",
  background: "var(--dash-surface-alt)",
  border: "1px solid var(--dash-border-light)",
  borderRadius: 6,
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  maxWidth: 180,
  textOverflow: "ellipsis",
};

export default function TokenUsageCard({ data, modelTokenUsage }: Props) {
  const models = useMemo(
    () => modelTokenUsage.map((m) => m.model),
    [modelTokenUsage]
  );

  const [selectedModel, setSelectedModel] = useState("__all__");

  const activeData = selectedModel === "__all__"
    ? data
    : (modelTokenUsage.find((m) => m.model === selectedModel)?.dailyUsage ?? []);

  const yMax = useMemo(() => {
    const max = Math.max(...activeData.map((d) => d.total), 1);
    return Math.ceil(max / 5000) * 5000 || 1000;
  }, [activeData]);

  const tickStep = yMax / 4;

  return (
    <div
      style={{
        background: "var(--dash-surface)",
        borderRadius: "0.75rem",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
        padding: "24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
        <div>
          <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 600, lineHeight: "24px", color: "var(--dash-text)", margin: "0 0 2px" }}>
            Token Usage
          </h3>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: "var(--dash-text-secondary)", margin: 0 }}>
            {selectedModel === "__all__" ? "All models" : selectedModel}
          </p>
        </div>

        {/* Model selector dropdown */}
        {models.length > 0 && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={selectStyle}
            >
              <option value="__all__">All Models</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <svg
              style={{
                position: "absolute", right: 8, top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none",
              }}
              width={10} height={10} viewBox="0 0 10 10" fill="none"
              stroke="var(--dash-text-secondary)" strokeWidth={1.5}
            >
              <path d="M2 3.5L5 6.5L8 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Empty state */}
      {activeData.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          <p style={{ fontSize: 13, color: "var(--dash-text-secondary)" }}>No token usage data for this model.</p>
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0, minHeight: 224, position: "relative", marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activeData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-light)" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--dash-text-secondary)", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }} dy={8} />
              <YAxis axisLine={false} tickLine={false} domain={[0, yMax]} ticks={[0, tickStep, tickStep * 2, tickStep * 3, tickStep * 4]} tick={{ fontSize: 10, fill: "var(--dash-text-secondary)", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="input" stroke="var(--dash-primary-fixed)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} connectNulls />
              <Line type="monotone" dataKey="total" stroke="var(--dash-primary)" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "var(--dash-primary)" }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, paddingTop: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--dash-text-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 0, borderTop: "2px dashed var(--dash-primary-fixed)", display: "inline-block" }} />
          Input Tokens
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2, background: "var(--dash-primary)", display: "inline-block" }} />
          Total Tokens
        </div>
      </div>
    </div>
  );
}
