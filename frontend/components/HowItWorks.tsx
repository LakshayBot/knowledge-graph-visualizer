"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const steps = [
  {
    n: "01",
    title: "Ask a Question",
    desc: "Type any natural-language question — geopolitical, economic, scientific, or social. No special syntax needed.",
    detail: '"Why is the rupee falling against USD?"',
    color: "#d2e4fb",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "Three-Phase Retrieval",
    desc: "Neo4j keyword search runs first. On miss, Qdrant semantic search (≥ 0.70 similarity). Only a true miss triggers Grok AI generation.",
    detail: "Neo4j → Qdrant → Grok AI",
    color: "#c8e8d4",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Grok Builds the Graph",
    desc: "A structured prompt to xAI's Grok returns a validated causal JSON graph — event nodes with dates, domains, confidence scores, source URLs, and directed edges with perspectives.",
    detail: "minimal · balanced · quality",
    color: "#ffdbcd",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    n: "04",
    title: "Persist & Cache",
    desc: "New nodes are bulk-written to Neo4j, embedded by Ollama (nomic-embed-text), and stored in Qdrant. Redis caches by topic + mode + count. Every query makes the system smarter.",
    detail: "Neo4j + Qdrant + Redis",
    color: "#b8e0cc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
];

// ── Step card (right column)
function StepCard({
  step,
  index,
  isLast,
  compact,
  active,
  onEnter,
  onLeave,
}: {
  step: typeof steps[0];
  index: number;
  isLast: boolean;
  compact: boolean;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: index * 0.09, duration: 0.45, ease: "easeOut" }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        display: "flex",
        gap: compact ? 16 : 24,
        position: "relative",
      }}
    >
      {/* Timeline column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        {/* Dot */}
        <motion.div
          animate={{
            background: active ? "var(--text-1)" : step.color,
            scale: active ? 1.15 : 1,
          }}
          transition={{ duration: 0.2 }}
          style={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: "50%",
            border: active ? "2px solid var(--text-1)" : "1.5px solid var(--border-med)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: active ? "var(--bg)" : "var(--text-2)",
            zIndex: 1,
            position: "relative",
          }}
        >
          {step.icon}
        </motion.div>
        {/* Connector line */}
        {!isLast && (
          <div
            style={{
              width: 1,
              flex: 1,
              minHeight: compact ? 16 : 20,
              background: "linear-gradient(to bottom, var(--border-med), var(--border))",
              margin: "6px 0",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ paddingBottom: isLast ? 0 : compact ? 20 : 28, flex: 1, paddingTop: compact ? 6 : 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--text-4)",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            {step.n}
          </span>
          <motion.h3
            animate={{ color: active ? "var(--text-1)" : "var(--text-1)" }}
            style={{
              fontSize: compact ? 14 : 16,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-1)",
              lineHeight: 1.1,
            }}
          >
            {step.title}
          </motion.h3>
        </div>

        <p
          style={{
            fontSize: compact ? 12 : 13,
            lineHeight: 1.65,
            color: "var(--text-3)",
            marginBottom: 10,
            maxWidth: 480,
          }}
        >
          {step.desc}
        </p>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: active ? "var(--text-1)" : "var(--bg-subtle)",
            border: "1px solid var(--border-med)",
            transition: "background 0.2s",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontFamily: "monospace",
              color: active ? "var(--bg)" : "var(--text-4)",
              textTransform: "uppercase",
              transition: "color 0.2s",
            }}
          >
            {step.detail}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── HowItWorks
export default function HowItWorks() {
  const bp = useBreakpoint();
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isNarrow = isMobile || isTablet;

  const sidePad = isMobile ? "24px" : isTablet ? "36px" : "52px";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {isNarrow ? (
        /* ── MOBILE / TABLET: full-width stacked ── */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              padding: `20px ${sidePad} 18px`,
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
              flexShrink: 0,
            }}
          >
            <span className="eyebrow">How It Works</span>
            <h2
              style={{
                fontSize: isTablet ? "clamp(18px,3vw,26px)" : "clamp(16px,5vw,22px)",
                fontWeight: 900,
                letterSpacing: "-0.035em",
                color: "var(--text-1)",
                lineHeight: 1,
                textAlign: "right",
              }}
            >
              Four steps from<br />question to graph.
            </h2>
          </div>

          {/* Steps */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: `24px ${sidePad} 24px`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {steps.map((step, i) => (
              <StepCard
                key={step.n}
                step={step}
                index={i}
                isLast={i === steps.length - 1}
                compact={isMobile}
                active={activeStep === i}
                onEnter={() => setActiveStep(i)}
                onLeave={() => setActiveStep(null)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── DESKTOP: two-column split ── */
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1.4fr", minHeight: 0 }}>
          {/* Left — sticky info panel */}
          <div
            style={{
              borderRight: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: `48px ${sidePad}`,
              overflow: "hidden",
            }}
          >
            {/* Top */}
            <div>
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="eyebrow"
                style={{ display: "block", marginBottom: 20 }}
              >
                How It Works
              </motion.span>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.5 }}
                style={{
                  fontSize: "clamp(32px, 3.2vw, 52px)",
                  fontWeight: 900,
                  letterSpacing: "-0.045em",
                  color: "var(--text-1)",
                  lineHeight: 1.0,
                  marginBottom: 20,
                }}
              >
                Four steps
                <br />
                from question
                <br />
                <span style={{ color: "var(--text-3)" }}>to graph.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.45 }}
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--text-3)",
                  maxWidth: 300,
                }}
              >
                A three-phase retrieval pipeline ensures AI generation only runs when
                truly needed — keeping latency low and quality high.
              </motion.p>
            </div>

            {/* Bottom — active step detail */}
            <motion.div
              key={activeStep ?? "none"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: "18px 20px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-med)",
              }}
            >
              {activeStep !== null ? (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-4)", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>
                    Step {steps[activeStep].n}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.025em", marginBottom: 6 }}>
                    {steps[activeStep].title}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {steps[activeStep].detail}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text-4)", fontStyle: "italic" }}>
                  Hover a step to preview details
                </div>
              )}
            </motion.div>
          </div>

          {/* Right — timeline steps */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: `40px ${sidePad} 40px 48px`,
              overflow: "hidden",
              gap: 0,
            }}
          >
            {steps.map((step, i) => (
              <StepCard
                key={step.n}
                step={step}
                index={i}
                isLast={i === steps.length - 1}
                compact={false}
                active={activeStep === i}
                onEnter={() => setActiveStep(i)}
                onLeave={() => setActiveStep(null)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
