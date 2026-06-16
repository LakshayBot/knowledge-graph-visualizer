"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { apiFetch } from "@/lib/api-client";
import type { SavedChain } from "@/types/graph";

/* ── Staggered card animation variants ─────────────────────── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

/* ── Inline SVG icons ──────────────────────────────────────── */
function PlusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ThreeDotIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

/* ── New Graph button (desktop) ────────────────────────────── */
function NewGraphButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href="/explore" style={{ textDecoration: "none", flexShrink: 0 }}>
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "var(--brand)",
          color: "var(--brand-fg)",
          border: "none",
          padding: "12px 24px",
          borderRadius: "0.5rem",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 16px rgba(159, 61, 0, 0.2)",
          transform: hovered ? "scale(1.02)" : "scale(1)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            transform: hovered ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <PlusIcon />
        </span>
        New Causal Graph
      </button>
    </Link>
  );
}

/* ── Format date ───────────────────────────────────────────── */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Lumina History Card ───────────────────────────────────── */
function LuminaHistoryCard({ chain }: { chain: SavedChain }) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  return (
    <motion.article
      variants={cardVariants}
      onClick={() => router.push(`/chains/${chain.chainId}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--surface)",
        border: `1px solid ${hovered ? "var(--brand)" : "var(--border)"}`,
        borderRadius: "0.5rem",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "clamp(200px, 28vh, 256px)",
        height: "auto",
        cursor: "pointer",
        boxShadow: hovered
          ? "0 20px 40px rgba(159, 61, 0, 0.06)"
          : "0 1px 3px rgba(0, 0, 0, 0.04)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
      }}
    >
      {/* Top section */}
      <div>
        {/* Domain badge + 3-dot menu */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              background: "var(--text-1)",
              color: "var(--bg)",
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 4,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.4,
            }}
          >
            {chain.domain || "General"}
          </span>

          {/* 3-dot menu — fades in on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              /* future: open context menu */
            }}
            style={{
              opacity: hovered ? 1 : 0,
              padding: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-3)",
              borderRadius: 4,
              transition: "opacity 0.2s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              e.currentTarget.style.background = "var(--bg-subtle)";
            }}
            onMouseLeave={(e) => {
              e.stopPropagation();
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ThreeDotIcon />
          </button>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
            color: hovered ? "var(--brand)" : "var(--text-1)",
            lineHeight: 1.35,
            margin: 0,
            letterSpacing: "-0.02em",
            transition: "color 0.2s ease",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {chain.chainTitle}
        </h3>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-4)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--brand)",
              flexShrink: 0,
            }}
          />
          {chain.nodeCount} {chain.nodeCount === 1 ? "Node" : "Nodes"}
        </span>
        <span>{formatDate(chain.savedAt)}</span>
      </div>
    </motion.article>
  );
}

/* ── History Content ───────────────────────────────────────── */
function HistoryContent() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [chains, setChains] = useState<SavedChain[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChains = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SavedChain[]>("/users/me/chains");
      setChains(
        [...(data ?? [])].sort(
          (a, b) =>
            new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        )
      );
    } catch {
      /* apiFetch handles 401 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChains();
  }, [loadChains]);

  /* ── Responsive padding ── */
  const containerPadding = isMobile
    ? "24px 20px 100px"
    : isTablet
    ? "32px 28px 80px"
    : "40px 32px 80px";

  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "clamp(960px, 90vw, 1440px)",
          margin: "0 auto",
          padding: containerPadding,
        }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "flex-end",
            justifyContent: "space-between",
            gap: isMobile ? 20 : 24,
            marginBottom: 48,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isMobile
                  ? "clamp(28px, 8vw, 36px)"
                  : "clamp(36px, 4vw, 48px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--text-1)",
                fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
                margin: "0 0 8px 0",
                lineHeight: 1.1,
              }}
            >
              History
            </h1>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-3)",
                margin: 0,
                fontFamily: "'Hanken Grotesk', system-ui, -apple-system, sans-serif",
              }}
            >
              All your saved causal graphs and structural models.
            </p>
          </div>

          {/* Desktop: New Graph button */}
          {!isMobile && <NewGraphButton />}
        </div>

        {/* ── Loading ─────────────────────────────────────── */}
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 0",
              gap: 12,
              color: "var(--text-4)",
              fontSize: 14,
              fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid var(--border-med)",
                borderTopColor: "var(--brand)",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            Loading history...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : chains.length === 0 ? (
          /* ── Empty state ────────────────────────────────── */
          <div
            style={{
              padding: "80px 24px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-4)"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-2)",
                  margin: "0 0 4px 0",
                  fontFamily: "'Manrope', system-ui, sans-serif",
                }}
              >
                No saved graphs yet
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-4)",
                  margin: 0,
                  maxWidth: 360,
                }}
              >
                Your search results and expanded graphs are automatically saved
                here. Start exploring to build your history.
              </p>
            </div>
            <Link
              href="/explore"
              style={{ textDecoration: "none", marginTop: 8 }}
            >
              <button
                style={{
                  background: "var(--brand)",
                  color: "var(--brand-fg)",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "0.5rem",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Manrope', system-ui, sans-serif",
                  cursor: "pointer",
                }}
              >
                Start Exploring
              </button>
            </Link>
          </div>
        ) : (
          /* ── Card grid ──────────────────────────────────── */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : isTablet
                ? "repeat(auto-fill, minmax(280px, 1fr))"
                : "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "clamp(16px, 2vw, 24px)",
            }}
          >
            {chains.map((chain) => (
              <LuminaHistoryCard key={chain.chainId} chain={chain} />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Mobile FAB ────────────────────────────────────── */}
      {isMobile && chains.length > 0 && (
        <Link
          href="/explore"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            background: "var(--brand)",
            color: "var(--brand-fg)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(159, 61, 0, 0.35)",
            zIndex: 50,
            textDecoration: "none",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <PlusIcon size={24} />
        </Link>
      )}
    </div>
  );
}

/* ── Page export ───────────────────────────────────────────── */
export default function HistoryPage() {
  return (
    <AuthGuard>
      <HistoryContent />
    </AuthGuard>
  );
}
