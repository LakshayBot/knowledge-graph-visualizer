"use client";

import { motion } from "framer-motion";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const steps = [
  {
    n: "01",
    title: "Ask a Question",
    desc: "Type any natural-language question — geopolitical, economic, scientific, or social.",
    detail: '"Why is the rupee falling against USD?"',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "Three-Phase Retrieval",
    desc: "Neo4j keyword → Qdrant semantic (≥ 0.70) → Grok AI. Only a true miss triggers generation.",
    detail: "Neo4j → Qdrant → Grok AI",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Grok Builds the Graph",
    desc: "Validated JSON returned: event nodes with dates, domains, confidence scores, source URLs, and directed causal edges.",
    detail: "minimal · balanced · quality",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    n: "04",
    title: "Persist & Cache",
    desc: "New nodes bulk-written to Neo4j, embedded by Ollama, stored in Qdrant. Redis caches by topic + mode + count.",
    detail: "Neo4j + Qdrant + Redis",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function HowItWorks() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const cols = isMobile ? 1 : isTablet ? 2 : 4;
  const px   = isMobile ? "20px" : isTablet ? "28px" : "40px";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: isMobile ? "20px 20px 16px" : `24px ${px} 20px`,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "baseline",
          justifyContent: "space-between",
          gap: isMobile ? 8 : 24,
        }}
      >
        <span className="eyebrow">How It Works</span>
        <h2 className="section-title">Four steps from question to graph.</h2>
      </div>

      {/* Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          flex: 1,
        }}
      >
        {steps.map((step, i) => {
          const isLastInRow = cols === 1 ? true
            : cols === 2 ? i % 2 === 1
            : i === 3;
          const isLastRow = cols === 1 ? i === steps.length - 1
            : cols === 2 ? i >= 2
            : true;

          return (
            <motion.div
              key={step.n}
              variants={cardVariants}
              style={{
                padding: isMobile ? "18px 20px 22px" : isTablet ? "20px 20px 24px" : "24px 24px 28px",
                borderRight: !isLastInRow ? "1px solid var(--border)" : "none",
                borderBottom: !isLastRow ? "1px solid var(--border)" : "none",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: isMobile ? 40 : 48,
                    fontWeight: 900,
                    color: "var(--border-med)",
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                    userSelect: "none",
                  }}
                >
                  {step.n}
                </span>
                <span
                  style={{
                    color: "var(--text-3)",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    padding: "7px",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {step.icon}
                </span>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.025em", marginBottom: 8 }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-3)", marginBottom: 16, flex: 1 }}>
                {step.desc}
              </p>
              <code style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-4)", textTransform: "uppercase", fontFamily: "monospace" }}>
                {step.detail}
              </code>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
