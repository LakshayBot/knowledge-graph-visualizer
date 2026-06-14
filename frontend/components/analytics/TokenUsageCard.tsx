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
        background: "#3c2d27",
        color: "#ffede7",
        border: "none",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, marginBottom: 6, color: "#ffede7" }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: 0, color: p.color, fontWeight: 600, fontSize: 11 }}>
          {p.name === "total"
            ? "Total"
            : p.name === "input"
              ? "Input"
              : "Output"}
          : {(p.value ?? 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function TokenUsageCard({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("tokens");

  // Compute nice Y-axis ticks
  const allVals = data.flatMap((d) => [d.input, d.output, d.total]);
  const maxVal = Math.max(...allVals, 1);
  const yMax = Math.ceil(maxVal / 1_500_000) * 1_500_000;
  const tickStep = yMax / 4;

  const totalTokens = data.reduce((s, d) => s + d.total, 0);

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
          marginBottom: 24,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 18,
              fontWeight: 600,
              lineHeight: "24px",
              color: "#251913",
              margin: 0,
            }}
          >
            Token Usage
          </h3>
          <p
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              lineHeight: "20px",
              color: "#594238",
              margin: "2px 0 0",
            }}
          >
            Tokens processed per hour
          </p>
        </div>
        {/* Legend dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#9f3d00",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#594238", fontFamily: "'Hanken Grotesk', sans-serif" }}>
              Total
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ffb596",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#594238", fontFamily: "'Hanken Grotesk', sans-serif" }}>
              Prompt
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 224, position: "relative", marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(224,192,179,0.25)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
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
              ticks={[0, tickStep, tickStep * 2, tickStep * 3, tickStep * 4]}
              tick={{
                fontSize: 10,
                fill: "#594238",
                fontWeight: 500,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : v.toString()
              }
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Dashed line for Prompt (input) */}
            <Line
              type="monotone"
              dataKey="input"
              stroke="#ffb596"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              connectNulls
            />
            {/* Solid line for Total */}
            <Line
              type="monotone"
              dataKey="total"
              stroke="#9f3d00"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: "#9f3d00" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Toggle switches */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 32,
          paddingTop: 16,
          borderTop: "1px solid rgba(224,192,179,0.3)",
        }}
      >
        {/* Tokens */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => setMode("tokens")}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: mode === "tokens" ? "#251913" : "#594238",
              transition: "color 0.2s",
            }}
          >
            Tokens
          </span>
          <div
            style={{
              width: 40,
              height: 20,
              borderRadius: 9999,
              background: mode === "tokens" ? "#9f3d00" : "#fce3da",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 2,
                right: mode === "tokens" ? 2 : 22,
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transition: "right 0.2s ease",
              }}
            />
          </div>
        </div>

        {/* Cost ($) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => setMode("cost")}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: mode === "cost" ? "#251913" : "#594238",
              transition: "color 0.2s",
            }}
          >
            Cost ($)
          </span>
          <div
            style={{
              width: 40,
              height: 20,
              borderRadius: 9999,
              background: mode === "cost" ? "#9f3d00" : "#fce3da",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 2,
                right: mode === "cost" ? 2 : 22,
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transition: "right 0.2s ease",
              }}
            />
          </div>
        </div>

        {/* Efficiency */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => setMode("efficiency")}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Hanken Grotesk', sans-serif",
              color: mode === "efficiency" ? "#251913" : "#594238",
              transition: "color 0.2s",
            }}
          >
            Efficiency
          </span>
          <div
            style={{
              width: 40,
              height: 20,
              borderRadius: 9999,
              background: mode === "efficiency" ? "#9f3d00" : "#fce3da",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 2,
                right: mode === "efficiency" ? 2 : 22,
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transition: "right 0.2s ease",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
