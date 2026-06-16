"use client";

import { motion } from "framer-motion";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function Features() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isNarrow = isMobile || isTablet;

  const cols = isMobile ? 1 : isTablet ? 2 : 3;
  const px   = isMobile ? "20px" : isTablet ? "28px" : "40px";

  // For desktop: first card spans 2 cols; for mobile/tablet: all full width
  const wideFirst = !isNarrow;

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
        <span className="eyebrow">Features</span>
        <h2 className="section-title">Everything needed to map causality.</h2>
      </div>

      {/* Bento grid */}
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
        {/* Card 1 — hero/wide */}
        <motion.div
          variants={cardVariants}
          style={{
            gridColumn: wideFirst ? "span 2" : "span 1",
            padding: isMobile ? "18px 20px 20px" : isTablet ? "18px 20px 22px" : "20px 24px 24px",
            borderRight: wideFirst ? "1px solid var(--border)" : (cols > 1 ? "1px solid var(--border)" : "none"),
            borderBottom: "1px solid var(--border)",
            background: "#4f6073",
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontFamily: "monospace", display: "block", marginBottom: 14 }}>
            Core Engine
          </span>
          <h3 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 10 }}>
            Grok AI Graph Generation
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", maxWidth: 480 }}>
            A single structured prompt to xAI&apos;s Grok produces a complete causal knowledge graph — nodes with dates, domains, confidence scores, source URLs, and directed edges. No Wikipedia scraping.
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["grok-3-mini", "grok-3", "JSON validated", "Directed edges"].map((t) => (
              <span key={t} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Card 2 — Three Generation Modes */}
        <motion.div
          variants={cardVariants}
          style={{
              padding: isMobile ? "18px 20px 20px" : "18px 20px 22px",
            borderBottom: "1px solid var(--border)",
            borderRight: (cols === 3 ? false : cols === 2 && !isMobile ? true : false) ? "1px solid var(--border)" : "none",
          }}
        >
          <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>Flexibility</span>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.025em", marginBottom: 8 }}>Three Generation Modes</h3>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-3)" }}>Minimal (grok-3-mini, 3k tokens) · Balanced (grok-3, 4k) · Quality (grok-3, 6k). Controllable per request.</p>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 7 }}>
            {[["minimal", "#00694a"], ["balanced", "#4f6073"], ["quality", "#9f3d00"]].map(([m, c]) => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-2)", fontWeight: 600 }}>{m}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Row 2: 3 cards */}
        {[
          {
            tag: "Three-Phase Retrieval",
            title: "Semantic + Keyword Search",
            desc: "Neo4j keyword → Qdrant vector similarity (≥ 0.70) → Grok generation. Only true misses trigger AI.",
            extra: (
              <div style={{ marginTop: 14, display: "flex", gap: 4, fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase" as const, flexWrap: "wrap" as const }}>
                {["Neo4j", "Qdrant", "Grok"].map((s, i, arr) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ padding: "3px 6px", background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>{s}</span>
                    {i < arr.length - 1 && <span style={{ color: "var(--text-4)" }}>→</span>}
                  </span>
                ))}
              </div>
            ),
            colRight: cols > 1,
            colBottom: false,
          },
          {
            tag: "Rich Metadata",
            title: "Causal Perspectives",
            desc: "Edges carry perspective labels and an is_contested flag. See who says what, and how disputed it is.",
            extra: (
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                {["Mainstream", "Geopolitical", "Structural", "Economic", "Revisionist"].map((p) => (
                  <span key={p} className="chip" style={{ fontSize: 8 }}>{p}</span>
                ))}
              </div>
            ),
            colRight: cols === 3,
            colBottom: false,
          },
          {
            tag: "Engineering",
            title: "Clean Architecture API",
            desc: ".NET 8 CQRS via MediatR, FluentValidation, EF Core + PostgreSQL, Python FastAPI sidecar.",
            extra: (
              <div style={{ marginTop: 14 }}>
                <code style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-4)", lineHeight: 1.5 }}>
                  Domain → Application
                  <br />→ Infrastructure → API
                </code>
              </div>
            ),
            colRight: false,
            colBottom: false,
          },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            variants={cardVariants}
            style={{
              padding: isMobile ? "18px 20px 20px" : "18px 20px 22px",
              borderRight: f.colRight ? "1px solid var(--border)" : (cols > 1 && i < cols - 1 ? "1px solid var(--border)" : "none"),
              borderBottom: f.colBottom ? "1px solid var(--border)" : "none",
            }}
          >
            <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>{f.tag}</span>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.025em", marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-3)" }}>{f.desc}</p>
            {f.extra}
          </motion.div>
        ))}
      </motion.div>

      {/* Stat bar */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(3, 1fr)", borderTop: "1px solid var(--border)" }}>
        {[
          { val: "<100ms", label: "Cache hit latency", color: "#00694a" },
          { val: "0.70",   label: "Semantic threshold", color: "#4f6073" },
          { val: "36/36",  label: "Tests passing",      color: "#9f3d00" },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: isMobile ? "16px 12px" : "22px 28px",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.04em", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: "var(--text-4)", marginTop: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
