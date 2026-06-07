"use client";

import { useState } from "react";
import type { SavedChain } from "@/types/graph";

interface Props {
  chain: SavedChain;
  onOpen: (chainId: string) => void;
  onDelete: (chainId: string) => Promise<void>;
}

export default function HistoryCard({ chain, onOpen, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);
  const date = new Date(chain.savedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date(chain.savedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  async function handleDelete() {
    setDeleting(true);
    await onDelete(chain.chainId);
    setDeleting(false);
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        transition: "border-color 0.15s, box-shadow 0.15s",
        opacity: deleting ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border-med)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--text-1)",
            margin: "0 0 4px 0",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {chain.chainTitle}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {chain.domain && <span className="chip" style={{ fontSize: 7 }}>{chain.domain}</span>}
          <span style={{ fontSize: 10, color: "var(--text-4)", letterSpacing: "0.04em" }}>
            {chain.nodeCount} nodes
          </span>
          <span style={{ fontSize: 10, color: "var(--text-4)", letterSpacing: "0.04em" }}>
            {date} · {time}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onOpen(chain.chainId)}
          style={{
            background: "var(--text-1)",
            color: "var(--bg)",
            border: "none",
            padding: "6px 12px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Continue
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: "transparent",
            color: "var(--text-4)",
            border: "1px solid var(--border)",
            padding: "6px 8px",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#e74c3c";
            e.currentTarget.style.borderColor = "#e74c3c";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-4)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          {deleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
