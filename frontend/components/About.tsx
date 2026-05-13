"use client";

import { motion } from "framer-motion";
import { useIsNarrow } from "../hooks/useBreakpoint";

const principles = [
  {
    title: "Why, not just what",
    desc: "Most search returns facts. CausalExplorer returns causal chains — structured graphs that answer why an event happened, not just that it happened.",
    n: "01",
  },
  {
    title: "Generation as last resort",
    desc: "AI generation is expensive and slow. Three search phases run first — only a genuine cache miss triggers Grok. The system gets smarter with every query.",
    n: "02",
  },
  {
    title: "Confidence over certainty",
    desc: "Every node carries a confidence score (0.4–0.95) and every edge can be marked contested. CausalExplorer acknowledges what is disputed rather than flattening it.",
    n: "03",
  },
];

export default function About() {
  const isNarrow = useIsNarrow();

  return (
    <section id="about" style={{ borderBottom: "1px solid var(--border)", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "1.4fr 1fr",
        }}
      >
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          style={{
            padding: isNarrow ? "48px 24px 40px" : "72px 52px 72px 44px",
            borderRight: isNarrow ? "none" : "1px solid var(--border)",
            borderBottom: isNarrow ? "1px solid var(--border)" : "none",
          }}
        >
          <span className="eyebrow" style={{ display: "block", marginBottom: 28 }}>About</span>

          <h2
            style={{
              fontSize: "clamp(28px, 3vw, 42px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "var(--text-1)",
              lineHeight: 1.06,
              marginBottom: 28,
            }}
          >
            Built to understand
            <br />
            the world causally.
          </h2>

          <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-3)", marginBottom: 16, maxWidth: 460 }}>
            CausalExplorer is a production-grade API system that turns natural-language
            questions into structured causal knowledge graphs. It combines a{" "}
            <strong style={{ color: "var(--text-1)", fontWeight: 700 }}>.NET 8 Clean Architecture backend</strong>,
            a{" "}
            <strong style={{ color: "var(--text-1)", fontWeight: 700 }}>Python FastAPI AI sidecar</strong>, and
            five backing services — Neo4j, Qdrant, Ollama, Redis, and PostgreSQL — all orchestrated in Docker.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-3)", maxWidth: 460, marginBottom: 44 }}>
            Most information systems tell you <em>what</em> happened. CausalExplorer tells
            you <em>why</em>. Every event node has a date, domain, confidence score, and
            source URL. Every edge has a perspective, strength, and contested flag.
          </p>

          {/* Tech badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 40 }}>
            {[".NET 8", "Python FastAPI", "Grok (xAI)", "Neo4j", "Qdrant", "Redis", "PostgreSQL", "Docker"].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "4px 10px",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-med)",
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <a href="https://github.com/LakshayBot/knowledge-graph-visualizer" target="_blank" rel="noopener noreferrer" className="btn-primary">
            View on GitHub
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>

        {/* Right — principles */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, x: isNarrow ? 0 : 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                padding: isNarrow ? "32px 24px" : "40px 36px",
                borderBottom: i < 2 ? "1px solid var(--border)" : "none",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--border-med)" }}>
                {p.n}
              </span>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.025em" }}>
                {p.title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.68, color: "var(--text-3)" }}>
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
