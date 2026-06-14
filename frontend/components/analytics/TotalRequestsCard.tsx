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
      <p style={{ margin: 0, color: "#22c55e", fontWeight: 700 }}>
        {payload[0].value?.toLocaleString()} requests
      </p>
    </div>
  );
}

export default function TotalRequestsCard({ data }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const skeletonRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading delay + GSAP reveal
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
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  const maxVal = Math.max(...data.map((d) => d.requests));
  const peakMonth = data.reduce((a, b) => (a.requests > b.requests ? a : b));

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Requests
          </CardTitle>
          {loaded && (
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              Max: {peakMonth.month} ·{" "}
              <span style={{ color: "var(--text-1)", fontWeight: 600 }}>
                {(peakMonth.requests / 1000).toFixed(0)}k
              </span>
            </span>
          )}
        </div>
        {loaded && (
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight">
              {data.reduce((s, d) => s + d.requests, 0).toLocaleString()}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">total</span>
          </div>
        )}
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
            {/* Sweeping shimmer overlay */}
            <div
              className="skeleton-shimmer"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Actual chart */}
          <div
            ref={chartRef}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
                <Bar
                  dataKey="requests"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  style={{ cursor: "pointer" }}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.requests === maxVal ? "#22c55e" : "var(--text-1)"}
                      opacity={entry.requests === maxVal ? 0.85 : 0.3}
                    />
                  ))}
                </Bar>
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
