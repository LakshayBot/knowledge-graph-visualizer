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

/* ── Lumina design tokens (scoped to this page) ─────── */
const LUMINA: Record<string, string> = {
  bg: "#fff8f6",
  surface: "#ffffff",
  "surface-container": "#ffe9e1",
  "text-primary": "#251913",
  "text-variant": "#594238",
  "outline-variant": "#e0c0b3",
  primary: "#9f3d00",
  "primary-fixed": "#ffdbcd",
  "primary-fixed-dim": "#ffb596",
  tertiary: "#00694a",
  "tertiary-fixed": "#82f9c6",
  "tertiary-fixed-dim": "#65dcab",
  "primary-container": "#c74e00",
  error: "#ba1a1a",
  "error-container": "#ffdad6",
  "surface-container-high": "#fce3da",
  "surface-container-highest": "#f6ded4",
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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        padding: "32px",
        background: LUMINA.bg,
        minHeight: "100%",
        fontFamily: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif",
        color: LUMINA["text-primary"],
        // CSS custom properties for child components
        "--lumina-surface": LUMINA.surface,
        "--lumina-surface-container": LUMINA["surface-container"],
        "--lumina-text": LUMINA["text-primary"],
        "--lumina-text-variant": LUMINA["text-variant"],
        "--lumina-primary": LUMINA.primary,
        "--lumina-outline-variant": LUMINA["outline-variant"],
      } as React.CSSProperties}
    >
      {/* ── Max-width container ── */}
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        {/* ═══════════════════════════════════════════════════
            HERO / HEADER
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
          <div>
            <h1
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "clamp(24px, 2.2vw, 32px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: LUMINA["text-primary"],
                margin: "0 0 4px",
              }}
            >
              Lumina Analytics
            </h1>
            <p
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 14,
                color: LUMINA["text-variant"],
                margin: 0,
              }}
            >
              Real-time metrics and performance insights for your knowledge graph
            </p>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Date picker */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${LUMINA["outline-variant"]}`,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'JetBrains Mono', monospace",
                color: LUMINA["text-variant"],
                cursor: "pointer",
                background: LUMINA.surface,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = LUMINA["text-primary"])
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = LUMINA["outline-variant"])
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Last 30 Days
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Export button */}
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: LUMINA["text-primary"],
                color: LUMINA.bg,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Hanken Grotesk', sans-serif",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Report
            </button>

            {/* Mobile app link */}
            <a
              href="#"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                border: `1px solid ${LUMINA["outline-variant"]}`,
                color: LUMINA["text-variant"],
                background: LUMINA.surface,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'Hanken Grotesk', sans-serif",
                textDecoration: "none",
                cursor: "pointer",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = LUMINA["text-primary"];
                e.currentTarget.style.color = LUMINA["text-primary"];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = LUMINA["outline-variant"];
                e.currentTarget.style.color = LUMINA["text-variant"];
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              Mobile App
            </a>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            LOADING STATE
           ═══════════════════════════════════════════════════ */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 0",
              gap: 12,
              color: LUMINA["text-variant"],
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid rgba(159,61,0,0.15)",
                borderTopColor: LUMINA.primary,
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Loading analytics...
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            ERROR STATE
           ═══════════════════════════════════════════════════ */}
        {error && (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: LUMINA["text-variant"],
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: LUMINA.error,
                fontFamily: "Manrope, sans-serif",
              }}
            >
              Failed to load analytics
            </p>
            <p style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                padding: "10px 24px",
                background: LUMINA.primary,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Hanken Grotesk', sans-serif",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            DASHBOARD GRID
           ═══════════════════════════════════════════════════ */}
        {data && (
          <>
            {/* ── TOP ROW: KPI cards ── */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="lumina-top-row"
            >
              {/* KPI 1: Total Cost */}
              <motion.div variants={fadeUp} className="lumina-kpi-1">
                <CostCard data={data.apiCosts} />
              </motion.div>

              {/* KPI 2: Infrastructure / Avg Cost */}
              <motion.div variants={fadeUp} className="lumina-kpi-2">
                <CostCard data={data.infrastructureCosts} />
              </motion.div>

              {/* KPI 3: Total Requests (wider) */}
              <motion.div variants={fadeUp} className="lumina-kpi-wide">
                <TotalRequestsCard data={data.monthlyRequests} />
              </motion.div>
            </motion.div>

            {/* ── MIDDLE ROW: Traffic + Latency ── */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="lumina-mid-row"
            >
              <motion.div variants={fadeUp}>
                <TrafficCard data={data.trafficLocations} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <LatencyCard latency={data.latency} />
              </motion.div>
            </motion.div>

            {/* ── BOTTOM ROW: Token Usage + Model Performance ── */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="lumina-bottom-row"
            >
              <motion.div variants={fadeUp}>
                <TokenUsageCard data={data.tokenUsage} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <ModelPerformanceCard data={data.modelPerformance} />
              </motion.div>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Keyframes + Responsive Grid ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Top Row: KPI cards ── */
        .lumina-top-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (min-width: 768px) {
          .lumina-top-row {
            grid-template-columns: 1fr 1fr;
          }
          .lumina-kpi-wide {
            grid-column: 1 / -1;
          }
        }
        @media (min-width: 1280px) {
          .lumina-top-row {
            grid-template-columns: 1fr 1fr 2fr 2fr;
          }
          .lumina-kpi-wide {
            grid-column: span 2;
          }
        }

        /* ── Middle Row: Traffic + Latency ── */
        .lumina-mid-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (min-width: 1024px) {
          .lumina-mid-row {
            grid-template-columns: 7fr 5fr;
          }
        }

        /* ── Bottom Row: Token + Models ── */
        .lumina-bottom-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          padding-bottom: 32px;
        }
        @media (min-width: 1024px) {
          .lumina-bottom-row {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
