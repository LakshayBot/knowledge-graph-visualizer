"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useBreakpoint } from "@/hooks/useBreakpoint";

// ── Graph data — fixed SVG coordinate space 500×340 ──────────
// Internal 20px padding baked into viewBox; nodes safe within bounds.
const VW = 500;
const VH = 340;
const R  = 22; // node circle radius

interface GNode { id: string; label: string; badge: string; x: number; y: number; color: string }
interface GEdge { from: string; to: string; label: string; dashed?: boolean }

const NODES: GNode[] = [
  { id: "inflation", label: "US Inflation",    badge: "Cause",  x:  88, y:  60, color: "#d2e4fb" },
  { id: "fed",       label: "Fed Rate Hike",   badge: "Policy", x: 250, y:  46, color: "#c8e8d4" },
  { id: "usd",       label: "USD Strengthens", badge: "Effect", x: 412, y:  80, color: "#ffdbcd" },
  { id: "deficit",   label: "Trade Deficit",   badge: "Cause",  x:  82, y: 175, color: "#d2e4fb" },
  { id: "flight",    label: "Capital Flight",  badge: "Effect", x: 412, y: 175, color: "#ffdbcd" },
  { id: "inr",       label: "INR Falls",       badge: "Effect", x: 250, y: 248, color: "#f6ded4" },
  { id: "rbi",       label: "RBI Intervenes",  badge: "Policy", x:  82, y: 255, color: "#c8e8d4" },
];

interface GEdge { from: string; to: string; label: string; dashed?: boolean; lx?: number; ly?: number }

const EDGES: GEdge[] = [
  // lx/ly = manual label offset from auto midpoint (in SVG units)
  { from: "inflation", to: "fed",     label: "triggers",  lx:  -8, ly: -14 },
  { from: "fed",       to: "usd",     label: "leads to",  lx:   0, ly: -12 },
  { from: "usd",       to: "flight",  label: "causes",    lx:  20, ly:   0 },
  { from: "flight",    to: "inr",     label: "pressures", lx:  28, ly:   0 },
  { from: "deficit",   to: "inr",     label: "deepens",   lx:   0, ly:  14, dashed: true },
  { from: "inr",       to: "rbi",     label: "responds",  lx:   0, ly:  14 },
  { from: "fed",       to: "deficit", label: "widens",    lx: -28, ly:   0, dashed: true },
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

// Shorten edge so arrowhead lands on circle rim, not centre
function trimEdge(x1: number, y1: number, x2: number, y2: number, r: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const trim = r + 4;
  return {
    sx: x1 + (dx / len) * trim,
    sy: y1 + (dy / len) * trim,
    ex: x2 - (dx / len) * trim,
    ey: y2 - (dy / len) * trim,
  };
}

// Gentle cubic bezier — lifts control points perpendicular to the edge
function cubicPath(x1: number, y1: number, x2: number, y2: number, bow = 0.22) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const nx = -dy * bow, ny = dx * bow; // perpendicular offset
  return `M${x1},${y1} C${mx + nx},${my + ny} ${mx + nx},${my + ny} ${x2},${y2}`;
}

// ── Casual Graph ─────────────────────────────────────────────
function CasualGraph() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    setMounted(true);
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Scale viewBox to fit container while keeping aspect ratio
  const aspect = VW / VH;
  const containerAspect = size.w / size.h;
  let svgW: number, svgH: number;
  if (containerAspect > aspect) {
    // container is wider than graph — constrain by height
    svgH = size.h;
    svgW = svgH * aspect;
  } else {
    // container is taller than graph — constrain by width
    svgW = size.w;
    svgH = svgW / aspect;
  }

  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width={svgW}
        height={svgH}
        style={{ display: "block", overflow: "hidden", flexShrink: 0 }}
      >
      <defs>
        {(["solid", "dashed", "active"] as const).map((t) => (
          <marker key={t} id={`arr-${t}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path
              d="M0,0.5 L0,5.5 L5.5,3 z"
              fill={t === "active" ? "var(--text-1)" : t === "dashed" ? "var(--text-4)" : "var(--text-3)"}
            />
          </marker>
        ))}
      </defs>

      {/* Edges */}
      {EDGES.map((edge) => {
        const fn = nodeMap[edge.from], tn = nodeMap[edge.to];
        const isActive = hovered === edge.from || hovered === edge.to;
        const { sx, sy, ex, ey } = trimEdge(fn.x, fn.y, tn.x, tn.y, R);
        const d = cubicPath(sx, sy, ex, ey);
        // Auto midpoint along the bezier bow, then apply manual offset
        const autoBowX = (sx + ex) / 2 + -(ey - sy) * 0.22;
        const autoBowY = (sy + ey) / 2 + (ex - sx) * 0.22;
        const lx = autoBowX + (edge.lx ?? 0);
        const ly = autoBowY + (edge.ly ?? 0);
        const type = isActive ? "active" : edge.dashed ? "dashed" : "solid";
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <path
              d={d}
              fill="none"
              stroke={isActive ? "var(--text-1)" : edge.dashed ? "var(--text-4)" : "var(--text-3)"}
              strokeWidth={isActive ? 1.6 : 1}
              strokeDasharray={edge.dashed ? "5,4" : undefined}
              markerEnd={`url(#arr-${type})`}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
            />
            {mounted && (
              <text
                x={lx} y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  fill: isActive ? "var(--text-2)" : "var(--text-4)",
                  fontFamily: "inherit",
                  transition: "fill 0.2s",
                  pointerEvents: "none",
                }}
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {NODES.map((node, i) => {
        const isHovered = hovered === node.id;
        return (
          <g
            key={node.id}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onTouchStart={() => setHovered(isHovered ? null : node.id)}
          >
            {/* Pulse ring on hover */}
            {isHovered && mounted && (
              <circle cx={node.x} cy={node.y} r={R + 10} fill="none"
                stroke="var(--text-1)" strokeWidth="0.8" opacity="0.18" />
            )}

            {/* Circle */}
            <circle
              cx={node.x} cy={node.y} r={R}
              fill={node.color}
              stroke={isHovered ? "var(--text-1)" : "var(--border-med)"}
              strokeWidth={isHovered ? 1.8 : 1}
              style={{ transition: "stroke 0.2s, r 0.2s" }}
            />

            {/* Badge pill above */}
            {mounted && (
              <>
                <rect
                  x={node.x - 18} y={node.y - R - 16}
                  width={36} height={12} rx={3}
                  fill={isHovered ? "var(--text-1)" : "var(--chip-bg)"}
                  style={{ transition: "fill 0.2s" }}
                />
                <text
                  x={node.x} y={node.y - R - 10}
                  textAnchor="middle" dominantBaseline="middle"
                  style={{
                    fontSize: 6, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", fill: "#fff",
                    fontFamily: "inherit", pointerEvents: "none",
                  }}
                >
                  {node.badge}
                </text>
              </>
            )}

            {/* Label below */}
            {mounted && (
              <text
                x={node.x} y={node.y + R + 13}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: 8.5, fontWeight: 700, letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fill: isHovered ? "var(--text-1)" : "var(--text-2)",
                  fontFamily: "inherit", pointerEvents: "none",
                  transition: "fill 0.2s",
                }}
              >
                {node.label}
              </text>
            )}

            {/* Tooltip — 2-line, clamped inside viewBox */}
            {isHovered && mounted && (() => {
              const raw = NODE_DETAILS[node.id];
              // Split at the em-dash or mid-point for two lines
              const splitIdx = raw.indexOf(" — ") !== -1
                ? raw.indexOf(" — ") + 3
                : Math.ceil(raw.length / 2);
              const line1 = raw.slice(0, splitIdx).trim();
              const line2 = raw.slice(splitIdx).trim();
              const bw = 172, bh = line2 ? 36 : 22, pad = 6;
              const bx = Math.min(Math.max(node.x - bw / 2, 4), VW - bw - 4);
              const byRaw = node.y - R - 20 - bh;
              const by = Math.max(byRaw, 4);
              return (
                <g>
                  <rect x={bx} y={by} width={bw} height={bh} rx={4} fill="var(--text-1)" />
                  <text
                    x={bx + bw / 2}
                    textAnchor="middle"
                    style={{ fontSize: 8, fill: "var(--bg)", fontFamily: "inherit", pointerEvents: "none", fontWeight: 500 }}
                  >
                    <tspan x={bx + bw / 2} dy={by + pad + 8}>{line1}</tspan>
                    {line2 && <tspan x={bx + bw / 2} dy={12}>{line2}</tspan>}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
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
              <span className="chip">Grok AI · Casual Graphs</span>
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
          <div style={{ flex: 1, position: "relative", background: "var(--bg-subtle)", minHeight: isMobile ? "clamp(240px, 35vh, 350px)" : 300, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--border-med) 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5, pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0 }}><CasualGraph /></div>
          </div>
        </div>
      ) : (
        /* ── DESKTOP / WIDE: side-by-side ── */
        <div
          className="mw"
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
              <span className="chip">Grok AI · Casual Graphs</span>
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
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--border-med) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none", opacity: 0.6 }} />
            <div style={{ position: "absolute", inset: 0 }}><CasualGraph /></div>
          </div>
        </div>
      )}
    </div>
  );
}
