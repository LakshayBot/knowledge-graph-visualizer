"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchDashboardMetrics, type DashboardMetrics } from "./metrics-data";
import CostCard from "./CostCard";
import TotalRequestsCard from "./TotalRequestsCard";
import TrafficCard from "./TrafficCard";
import LatencyCard from "./LatencyCard";
import TokenUsageCard from "./TokenUsageCard";
import ModelPerformanceCard from "./ModelPerformanceCard";

/* ── Animation variants ────────────────────────────── */
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function DashboardMetrics() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboardMetrics()
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
        padding: "clamp(16px, 3vw, 32px)",
        background: "var(--dash-bg)",
        minHeight: "100%",
        fontFamily: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif",
        color: "var(--dash-text)",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        {/* ═══════════════════════════════════════════════════
            HEADER
           ═══════════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 32,
            flexWrap: "wrap",
          }}
        >
        </div>

        {/* ═══════════════════════════════════════════════════
            LOADING
           ═══════════════════════════════════════════════════ */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12, color: "var(--dash-text-secondary)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
            <div style={{ width: 20, height: 20, border: "2px solid var(--dash-spinner-track)", borderTopColor: "var(--dash-primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Loading dashboard...
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            ERROR
           ═══════════════════════════════════════════════════ */}
        {error && (
          <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--dash-text-secondary)" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-error)", fontFamily: "Manrope, sans-serif" }}>Failed to load dashboard</p>
            <p style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{error}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "10px 24px", background: "var(--dash-primary)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Hanken Grotesk', sans-serif" }}>Retry</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            DASHBOARD GRID
           ═══════════════════════════════════════════════════ */}
        {data && (
          <>
            {/* ── TOP ROW: API Costs (wide) + Total Requests ── */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="dash-top-row">
              <motion.div variants={fadeUp} className="dash-kpi-wide">
                <CostCard data={data.apiCosts} />
              </motion.div>
              <motion.div variants={fadeUp} className="dash-kpi-chart">
                <TotalRequestsCard data={data.dailyRequests} />
              </motion.div>
            </motion.div>

            {/* ── MIDDLE ROW: Traffic + Latency ── */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="dash-mid-row">
              <motion.div variants={fadeUp}>
                <TrafficCard data={data.trafficCategories} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <LatencyCard latency={data.latency} modelLatencies={data.modelLatencies} />
              </motion.div>
            </motion.div>

            {/* ── BOTTOM ROW: Token Usage + Model Heatmap ── */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="dash-bottom-row">
              <motion.div variants={fadeUp}>
                <TokenUsageCard data={data.tokenUsage} modelTokenUsage={data.modelTokenUsage} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <ModelPerformanceCard data={data.modelHeatmap} />
              </motion.div>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Keyframes + Responsive Grid + Dark Mode Tokens ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Dashboard dark/light CSS custom properties ── */
        :root {
          --dash-bg:              #fff8f6;
          --dash-surface:         #ffffff;
          --dash-surface-alt:     #ffe9e1;
          --dash-surface-high:    #fce3da;
          --dash-surface-highest: #f6ded4;
          --dash-text:            #251913;
          --dash-text-secondary:  #594238;
          --dash-heading:         #251913;
          --dash-border:          #e0c0b3;
          --dash-border-light:    rgba(224,192,179,0.3);
          --dash-primary:         #9f3d00;
          --dash-primary-fixed:   #ffb596;
          --dash-primary-dim:     #ffdbcd;
          --dash-tertiary:        #00694a;
          --dash-tertiary-fixed:  #82f9c6;
          --dash-error:           #ba1a1a;
          --dash-error-bg:        #ffdad6;
          --dash-spinner-track:   rgba(159,61,0,0.15);
          --dash-card-shadow:     0 4px 24px rgba(0,0,0,0.02);
          --dash-card-shadow-hover: 0 8px 32px rgba(0,0,0,0.04);
          --dash-card-border:     rgba(0,0,0,0.04);
          --dash-card-border-hover: rgba(0,0,0,0.08);
        }

        .dark {
          --dash-bg:              #1a1410;
          --dash-surface:         #211b16;
          --dash-surface-alt:     #2a1f18;
          --dash-surface-high:    #34261c;
          --dash-surface-highest: #3d2c20;
          --dash-text:            #f0e8e0;
          --dash-text-secondary:  #b8a89a;
          --dash-heading:         #f0e8e0;
          --dash-border:          #4a3a2e;
          --dash-border-light:    rgba(74,58,46,0.4);
          --dash-primary:         #ff8a50;
          --dash-primary-fixed:   #9f3d00;
          --dash-primary-dim:     #6b2a00;
          --dash-tertiary:        #50e3c2;
          --dash-tertiary-fixed:  #1a4a3a;
          --dash-error:           #ff6b6b;
          --dash-error-bg:        #3a1a1a;
          --dash-spinner-track:   rgba(255,138,80,0.15);
          --dash-card-shadow:     0 4px 24px rgba(0,0,0,0.15);
          --dash-card-shadow-hover: 0 8px 32px rgba(0,0,0,0.25);
          --dash-card-border:     rgba(255,255,255,0.04);
          --dash-card-border-hover: rgba(255,255,255,0.08);
        }

        /* ── Top Row: API Costs (wider) + Requests ── */
        .dash-top-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (min-width: 640px) {
          .dash-top-row { grid-template-columns: 1fr 1fr; }
          .dash-kpi-wide { grid-column: 1 / -1; }
        }
        @media (min-width: 1024px) {
          .dash-top-row { grid-template-columns: 5fr 3fr; }
          .dash-kpi-wide { grid-column: span 1; }
        }
        @media (min-width: 1280px) {
          .dash-top-row { grid-template-columns: 3fr 2fr; }
        }

        /* ── Middle Row: Traffic + Latency ── */
        .dash-mid-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (min-width: 768px) { .dash-mid-row { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .dash-mid-row { grid-template-columns: 7fr 5fr; } }

        /* ── Bottom Row ── */
        .dash-bottom-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          padding-bottom: 32px;
        }
        @media (min-width: 768px) { .dash-bottom-row { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
}
