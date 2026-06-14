"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyRequest } from "./data";

interface Props {
  data: MonthlyRequest[];
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
      <p style={{ margin: 0, fontWeight: 600, marginBottom: 4, color: "#f5f2ec" }}>
        {label}
      </p>
      <p style={{ margin: 0, color: "#fb923c", fontWeight: 700 }}>
        {payload[0]?.value?.toLocaleString()} requests
      </p>
    </div>
  );
}

export default function TotalRequestsCard({ data }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const skeletonRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (skeletonRef.current && chartRef.current) {
        gsap.to(skeletonRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            setLoaded(true);
            gsap.fromTo(
              chartRef.current,
              { opacity: 0, y: 12 },
              { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
            );
          },
        });
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const maxVal = Math.max(...data.map((d) => d.requests));
  const peakMonth = data.reduce((a, b) => (a.requests > b.requests ? a : b));

  return (
    <Card className="border-border/60 shadow-xs" style={{ borderRadius: 12 }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Requests
          </CardTitle>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            Max: <span style={{ color: "#fb923c", fontWeight: 600 }}>{peakMonth.month} · {(peakMonth.requests / 1000).toFixed(0)}k</span>
          </span>
        </div>
        <div className="mt-0">
          <span className="text-2xl font-bold tracking-tight">
            {data.reduce((s, d) => s + d.requests, 0).toLocaleString()}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">total</span>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ position: "relative", height: 200 }}>
          {/* Skeleton */}
          <div
            ref={skeletonRef}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              padding: "0 4px",
            }}
          >
            {data.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${30 + Math.random() * 60}%`,
                  borderRadius: 4,
                  background: "linear-gradient(180deg, var(--border-med) 0%, var(--border) 100%)",
                  opacity: 0.5,
                }}
              />
            ))}
            <div
              className="skeleton-shimmer"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Actual combo chart */}
          <div ref={chartRef} style={{ position: "absolute", inset: 0, opacity: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--text-3)", fontWeight: 500 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--text-3)", fontWeight: 500 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--border)", opacity: 0.3 }} />
                {/* Bars */}
                <Bar dataKey="requests" radius={[6, 6, 0, 0]} maxBarSize={28} style={{ cursor: "pointer" }}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={entry.requests === maxVal ? "#fb923c" : "#fb923c"}
                      fillOpacity={entry.requests === maxVal ? 0.9 : 0.35}
                    />
                  ))}
                </Bar>
                {/* Dashed orange trend line */}
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#fb923c"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Card>
  );
}
