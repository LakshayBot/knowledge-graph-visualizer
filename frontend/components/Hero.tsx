"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBreakpoint } from "@/hooks/useBreakpoint";

// ── Types ────────────────────────────────────────────────────
interface GraphNode {
  id: string;
  badge: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
}
interface GraphEdge {
  from: string;
  to: string;
  label: string;
  dashed?: boolean;
}

const NODES: GraphNode[] = [
  { id: "inflation", badge: "Cause",  label: "US Inflation",    x: 18, y: 12, size: 64, color: "#c8ccd4" },
  { id: "fed",       badge: "Policy", label: "Fed Rate Hike",   x: 46, y: 8,  size: 72, color: "#ccd4c8" },
  { id: "usd",       badge: "Effect", label: "USD Strengthens", x: 76, y: 20, size: 62, color: "#d4ccc8" },
  { id: "deficit",   badge: "Cause",  label: "Trade Deficit",   x: 16, y: 52, size: 58, color: "#c8ccd4" },
  { id: "flight",    badge: "Effect", label: "Capital Flight",  x: 77, y: 50, size: 64, color: "#d4ccc8" },
  { id: "inr",       badge: "Effect", label: "INR Falls",       x: 48, y: 74, size: 72, color: "#d4c8c8" },
  { id: "rbi",       badge: "Policy", label: "RBI Intervenes",  x: 20, y: 85, size: 56, color: "#ccd4c8" },
];

const EDGES: GraphEdge[] = [
  { from: "inflation", to: "fed",     label: "triggers" },
  { from: "fed",       to: "usd",     label: "leads to" },
  { from: "usd",       to: "flight",  label: "causes" },
  { from: "flight",    to: "inr",     label: "pressures" },
  { from: "deficit",   to: "inr",     label: "deepens",  dashed: true },
  { from: "inr",       to: "rbi",     label: "responds" },
  { from: "fed",       to: "deficit", label: "widens",   dashed: true },
];

const NODE_DETAILS: Record<string, string> = {
  inflation:  "US CPI rose 8.5% YoY in Mar 2022 — highest in 40 years.",
  fed:        "Fed hiked rates 425bps in 2022 to combat runaway inflation.",
  usd:        "DXY index hit 20-yr high of 114 in Sep 2022.",
  deficit:    "India's trade deficit widened to $26B/mo in mid-2022.",
  flight:     "FIIs pulled $30B+ from Indian equities in 2022.",
  inr:        "INR crossed ₹83/USD for the first time in Oct 2022.",
  rbi:        "RBI sold $100B+ of forex reserves to defend rupee.",
};

// ── Causal Graph ─────────────────────────────────────────────
function CausalGraph() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 460 });

  useEffect(() => {
    setMounted(true);
    const update = () => {
      if (containerRef.current) {
        setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  function px(node: GraphNode) {
    return { x: (node.x / 100) * dims.w, y: (node.y / 100) * dims.h };
  }

  if (!mounted) return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 360 }} />;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: 360 }}>
      {/* SVG edges */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
        <defs>
          {["solid", "dashed", "active"].map((t) => (
            <marker key={t} id={`arr-${t}`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0.5 L0,5.5 L6.5,3 z" fill={t === "active" ? "var(--text-1)" : t === "dashed" ? "var(--text-4)" : "var(--text-3)"} />
            </marker>
          ))}
        </defs>

        {EDGES.map((edge) => {
          const from = NODES.find((n) => n.id === edge.from)!;
          const to   = NODES.find((n) => n.id === edge.to)!;
          const fp = px(from);
          const tp = px(to);
          const isActive = hovered === from.id || hovered === to.id;
          const mx = (fp.x + tp.x) / 2;
          const my = (fp.y + tp.y) / 2;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                stroke={isActive ? "var(--text-1)" : edge.dashed ? "var(--text-4)" : "var(--text-3)"}
                strokeWidth={isActive ? 1.8 : 1.2}
                strokeDasharray={edge.dashed ? "5,4" : undefined}
                markerEnd={`url(#arr-${isActive ? "active" : edge.dashed ? "dashed" : "solid"})`}
                style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
              />
              <text
                x={mx} y={my - 5}
                textAnchor="middle"
                style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fill: isActive ? "var(--text-1)" : "var(--text-4)", fontFamily: "inherit", transition: "fill 0.2s" }}
              >
                {edge.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {NODES.map((node, i) => {
        const pos = px(node);
        const isHovered = hovered === node.id;
        return (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.4, type: "spring", stiffness: 200 }}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              zIndex: isHovered ? 10 : 1,
              cursor: "pointer",
            }}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onTouchStart={() => setHovered(isHovered ? null : node.id)}
          >
            <span className="chip" style={{ fontSize: 7, padding: "2px 5px" }}>{node.badge}</span>

            <motion.div
              animate={{ scale: isHovered ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{
                width: node.size,
                height: node.size,
                borderRadius: "50%",
                background: node.color,
                border: isHovered ? "2px solid var(--text-1)" : "1.5px solid var(--border-med)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "border 0.2s",
              }}
            >
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--text-1)", pointerEvents: "none" }}
                  />
                )}
              </AnimatePresence>
              <svg width={node.size * 0.34} height={node.size * 0.34} viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5">
                {node.badge === "Policy" && <path d="M12 3L3 8v8l9 5 9-5V8L12 3z"/>}
                {node.badge === "Cause"  && <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>}
                {node.badge === "Effect" && <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round"/></>}
              </svg>
            </motion.div>

            <div
              style={{
                background: isHovered ? "var(--text-1)" : "var(--surface)",
                color: isHovered ? "var(--bg)" : "var(--text-1)",
                border: "1px solid var(--border-med)",
                borderRadius: 20,
                padding: "2px 8px",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {node.label}
            </div>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    top: "110%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--text-1)",
                    color: "var(--bg)",
                    fontSize: 10,
                    lineHeight: 1.5,
                    padding: "8px 12px",
                    borderRadius: 4,
                    maxWidth: 170,
                    whiteSpace: "normal",
                    zIndex: 20,
                    pointerEvents: "none",
                    textAlign: "center",
                  }}
                >
                  {NODE_DETAILS[node.id]}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────
export default function Hero() {
  const bp = useBreakpoint();
  const isMobile  = bp === "mobile";
  const isTablet  = bp === "tablet";
  const isNarrow  = isMobile || isTablet;

  const px = isMobile ? "20px" : isTablet ? "32px" : "44px";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {isNarrow ? (
        /* ── MOBILE / TABLET: stacked layout ── */
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Text half */}
          <div
            style={{
              padding: isMobile ? "36px 20px 28px" : "48px 32px 32px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{ marginBottom: 18 }}
            >
              <span className="chip">Grok AI · Causal Graphs</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.55 }}
              style={{
                fontSize: isMobile ? "clamp(36px, 10vw, 52px)" : "clamp(40px, 7vw, 60px)",
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: "-0.04em",
                color: "var(--text-1)",
                margin: "0 0 14px 0",
              }}
            >
              understand{" "}
              <span style={{ color: "var(--text-3)" }}>why</span>
              <br />things happen.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.5 }}
              style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text-3)", marginBottom: 24 }}
            >
              Ask any question. Get a structured cause-and-effect graph
              built by Grok AI — events, edges, confidence scores, all connected.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.5 }}
              style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
            >
              <a href="#how-it-works" className="btn-primary">
                How It Works
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a href="https://github.com/LakshayBot/knowledge-graph-visualizer" target="_blank" rel="noopener noreferrer" className="btn-outline">
                GitHub ↗
              </a>
            </motion.div>
          </div>

          {/* Graph half — takes remaining space */}
          <div
            style={{
              flex: 1,
              position: "relative",
              background: "var(--bg-subtle)",
              minHeight: isMobile ? 260 : 340,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: "radial-gradient(var(--border-med) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                opacity: 0.5,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", width: "100%", height: "100%", padding: "20px 12px" }}>
              <CausalGraph />
            </div>
          </div>
        </div>
      ) : (
        /* ── DESKTOP / WIDE: side-by-side ── */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Left text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: `60px ${px} 60px ${px}`,
              borderRight: "1px solid var(--border)",
              overflowY: "auto",
            }}
          >
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} style={{ marginBottom: 22 }}>
              <span className="chip">Grok AI · Causal Graphs</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.6 }}
              style={{
                fontSize: "clamp(42px, 4.5vw, 66px)",
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: "-0.045em",
                color: "var(--text-1)",
                margin: "0 0 16px 0",
              }}
            >
              understand
              <br />
              <span style={{ color: "var(--text-3)" }}>why</span> things
              <br />
              happen.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5 }}
              style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-3)", maxWidth: 320, margin: "0 0 36px 0" }}
            >
              Ask any question. Get a structured cause-and-effect graph built by
              Grok AI — events, edges, confidence scores, all connected.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.5 }}
              style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 44 }}
            >
              <a href="#how-it-works" className="btn-primary">
                See How It Works
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a href="https://github.com/LakshayBot/knowledge-graph-visualizer" target="_blank" rel="noopener noreferrer" className="btn-outline">
                View on GitHub
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.52, duration: 0.5 }}
              style={{ paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", gap: 28 }}
            >
              {[
                { v: "3",      l: "search phases" },
                { v: "36/36",  l: "tests passing" },
                { v: "<100ms", l: "cache hit" },
              ].map((s) => (
                <div key={s.l}>
                  <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)" }}>{s.v}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right graph */}
          <div style={{ position: "relative", overflow: "hidden", background: "var(--bg-subtle)" }}>
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: "radial-gradient(var(--border-med) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                pointerEvents: "none",
                opacity: 0.6,
              }}
            />
            <div style={{ position: "relative", width: "100%", height: "100%", padding: "28px 20px" }}>
              <CausalGraph />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
