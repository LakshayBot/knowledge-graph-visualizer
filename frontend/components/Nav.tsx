"use client";

import { useState, useEffect } from "react";
import { useIsNarrow } from "@/hooks/useBreakpoint";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features",     href: "#features" },
  { label: "API",          href: "#api" },
  { label: "About",        href: "#about" },
];

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

// Smooth scroll with easeInOutQuart easing
function smoothScrollTo(target: number, duration = 560) {
  const start = window.scrollY;
  const delta = target - start;
  const startTime = performance.now();

  function ease(t: number) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, start + delta * ease(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export default function Nav() {
  const [mounted, setMounted]       = useState(false);
  const [dark, setDark]             = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const narrow = useIsNarrow();

  // Single mount effect — reads localStorage & sets up scroll listener
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!narrow) setMenuOpen(false);
  }, [narrow]);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function navTo(href: string) {
    setMenuOpen(false);
    const id = href.replace("#", "");
    const target = document.getElementById(id);
    if (target) {
      // Offset for sticky chrome (banner 34px + nav 56px = 90px)
      const CHROME = 90;
      const top = target.getBoundingClientRect().top + window.scrollY - CHROME;
      smoothScrollTo(top, 560);
    }
  }

  // Render a stable skeleton until hydration is complete to avoid mismatch
  if (!mounted) {
    return (
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          height: 56,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.05em", color: "var(--text-1)", display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 20, height: 20, background: "var(--text-1)", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          CausalExplorer
        </span>
        {/* Skeleton right side — always desktop layout on server */}
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {links.map((l) => (
            <span key={l.label} style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)" }}>{l.label}</span>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: narrow ? "0 20px" : "0 40px",
          height: 56,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
          boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.06)" : "none",
          transition: "box-shadow 0.2s ease",
        }}
      >
        {/* Wordmark */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); navTo("#overview"); }}
          style={{
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            color: "var(--text-1)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              width: 20, height: 20,
              background: "var(--text-1)",
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          CausalExplorer
        </a>

        {/* Desktop links */}
        {!narrow && (
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navTo(link.href); }}
                style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={toggleDark}
              aria-label="Toggle dark mode"
              style={{
                background: "transparent",
                border: "1px solid var(--border-med)",
                color: "var(--text-2)",
                cursor: "pointer",
                padding: "5px 7px",
                display: "flex",
                alignItems: "center",
                borderRadius: 4,
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor = "var(--text-1)"; b.style.color = "var(--text-1)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = "var(--border-med)"; b.style.color = "var(--text-2)"; }}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <a
              href="https://github.com/LakshayBot/knowledge-graph-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "var(--text-1)",
                color: "var(--bg)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.03em",
                padding: "6px 14px",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              GitHub ↗
            </a>
          </div>
        )}

        {/* Mobile right controls */}
        {narrow && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={toggleDark}
              aria-label="Toggle dark mode"
              style={{ background: "transparent", border: "1px solid var(--border-med)", color: "var(--text-2)", cursor: "pointer", padding: "5px 7px", display: "flex", alignItems: "center", borderRadius: 4 }}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: "6px", display: "flex", flexDirection: "column", gap: 4, color: "var(--text-1)" }}
            >
              <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 1, transition: "transform 0.2s", transform: menuOpen ? "rotate(45deg) translate(4px,4px)" : "none" }} />
              <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 1, transition: "opacity 0.2s", opacity: menuOpen ? 0 : 1 }} />
              <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 1, transition: "transform 0.2s", transform: menuOpen ? "rotate(-45deg) translate(4px,-4px)" : "none" }} />
            </button>
          </div>
        )}
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "fixed",
              top: 90,
              left: 0,
              right: 0,
              bottom: 0,
              background: "var(--bg)",
              zIndex: 150,
              display: "flex",
              flexDirection: "column",
              padding: "32px 24px",
              gap: 0,
              borderTop: "1px solid var(--border)",
            }}
          >
            {links.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navTo(link.href); }}
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "var(--text-1)",
                  textDecoration: "none",
                  padding: "16px 0",
                  borderBottom: i < links.length - 1 ? "1px solid var(--border)" : "none",
                  display: "block",
                }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ marginTop: 32 }}>
              <a
                href="https://github.com/LakshayBot/knowledge-graph-visualizer"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                View on GitHub ↗
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
