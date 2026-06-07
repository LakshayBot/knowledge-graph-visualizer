"use client";

import Link from "next/link";
import type { SavedChain } from "@/types/graph";

export default function SavedChainCard({ chain }: { chain: SavedChain }) {
  const date = new Date(chain.savedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/chains/${chain.chainId}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        textDecoration: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border-med)";
        el.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--text-1)",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {chain.chainTitle}
        </h3>
        <span
          className="chip"
          style={{ fontSize: 8, flexShrink: 0 }}
        >
          {chain.domain}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 10, color: "var(--text-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {chain.nodeCount} nodes
        </span>
        <span style={{ fontSize: 10, color: "var(--text-4)", letterSpacing: "0.06em" }}>
          {date}
        </span>
      </div>

      {chain.notes && (
        <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.5, margin: 0 }}>
          {chain.notes}
        </p>
      )}
    </Link>
  );
}
