"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchAnalyticsOverview, type AnalyticsOverview } from "./data";
import CostCard from "./CostCard";
import TotalRequestsCard from "./TotalRequestsCard";
import TrafficCard from "./TrafficCard";
import LatencyCard from "./LatencyCard";
import TokenUsageCard from "./TokenUsageCard";
import ModelPerformanceCard from "./ModelPerformanceCard";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAnalyticsOverview()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      style={{
        padding: "32px 28px 60px",
        background: "var(--bg)",
        minHeight: "100%",
      }}
    >
      {/* ── Hero / Title Section ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(22px, 2.5vw, 30px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "var(--text-1)",
              marginBottom: 4,
            }}
          >
            Analytics Overview
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            Real-time metrics and performance insights for your knowledge graph
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-2)",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Last 30 Days
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--text-1)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </button>

          <a
            href="#"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "none",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--text-1)"; e.currentTarget.style.color = "var(--text-1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            Mobile App
          </a>
        </div>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 10, color: "var(--text-4)", fontSize: 13 }}>
          <div style={{ width: 18, height: 18, border: "2px solid var(--border-med)", borderTopColor: "var(--text-1)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          Loading analytics...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text-3)" }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>Failed to load analytics</p>
          <p style={{ fontSize: 12 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 20px", background: "var(--text-1)", color: "var(--bg)", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Dashboard Grid ── */}
      {data && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 14, alignItems: "start" }}
        >
          {/* Row 1 */}
          <motion.div variants={cardVariants}>
            <CostCard data={data.apiCosts} />
          </motion.div>
          <motion.div variants={cardVariants}>
            <CostCard data={data.infrastructureCosts} />
          </motion.div>
          <motion.div variants={cardVariants}>
            <TotalRequestsCard data={data.monthlyRequests} />
          </motion.div>
        </motion.div>
      )}

      {/* Row 2 */}
      {data && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14, alignItems: "stretch" }}
        >
          <motion.div variants={cardVariants}>
            <TrafficCard data={data.trafficLocations} />
          </motion.div>
          <motion.div variants={cardVariants}>
            <LatencyCard latency={data.latency} costs={[data.apiCosts, data.infrastructureCosts]} />
          </motion.div>
        </motion.div>
      )}

      {/* Row 3 */}
      {data && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14, alignItems: "stretch" }}
        >
          <motion.div variants={cardVariants}>
            <TokenUsageCard data={data.tokenUsage} />
          </motion.div>
          <motion.div variants={cardVariants}>
            <ModelPerformanceCard data={data.modelPerformance} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
