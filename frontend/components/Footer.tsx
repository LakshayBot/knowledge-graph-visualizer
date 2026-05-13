"use client";

import { useIsNarrow } from "../hooks/useBreakpoint";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features",     href: "#features" },
  { label: "API Preview",  href: "#api" },
  { label: "About",        href: "#about" },
];

const stack = [
  { label: "Grok (xAI)",  href: "https://x.ai" },
  { label: "Neo4j",        href: "https://neo4j.com" },
  { label: ".NET 8",       href: "https://dotnet.microsoft.com" },
  { label: "Next.js 16",   href: "https://nextjs.org" },
];

export default function Footer() {
  const isNarrow = useIsNarrow();

  return (
    <footer style={{ borderTop: "1px solid var(--border)", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Main footer row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "1fr auto auto",
          gap: isNarrow ? 32 : 64,
          alignItems: "start",
          padding: isNarrow ? "40px 24px 32px" : "52px 44px 44px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Brand */}
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              color: "var(--text-1)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                background: "var(--text-1)",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            CausalExplorer
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, maxWidth: 220 }}>
            Understand why events happen.
            <br />
            Causal graphs. Not just answers.
          </p>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", flexDirection: isNarrow ? "row" : "column", flexWrap: "wrap", gap: isNarrow ? "8px 20px" : 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-4)", textTransform: "uppercase", marginBottom: isNarrow ? 0 : 4, width: isNarrow ? "100%" : "auto" }}>Navigation</span>
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* GitHub + stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-4)", textTransform: "uppercase", marginBottom: 4 }}>Links</span>
          <a
            href="https://github.com/LakshayBot/knowledge-graph-visualizer"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-2)",
              textDecoration: "none",
              border: "1px solid var(--border-med)",
              padding: "7px 14px",
              transition: "border-color 0.15s, color 0.15s",
              alignSelf: "flex-start",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-1)";
              e.currentTarget.style.borderColor = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-2)";
              e.currentTarget.style.borderColor = "var(--border-med)";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub Repository ↗
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isNarrow ? "16px 24px" : "18px 44px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <p style={{ fontSize: 11, color: "var(--text-4)" }}>
          © {new Date().getFullYear()} CausalExplorer. Open source.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>Built with</span>
          {stack.map((s, i) => (
            <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: "var(--text-3)", textDecoration: "none", fontWeight: 600, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
              >
                {s.label}
              </a>
              {i < stack.length - 1 && <span style={{ color: "var(--text-4)", fontSize: 11 }}>·</span>}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
