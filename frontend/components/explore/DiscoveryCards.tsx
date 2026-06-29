"use client";

import { useMemo } from "react";
import type { GraphNode } from "@/types/graph";

interface DiscoveryCardsProps {
  nodes: GraphNode[];
  query: string;
  onQuerySelect: (query: string) => void;
}

/** Generate follow-up questions relevant to the current query and graph */
function generateSuggestions(nodes: GraphNode[], query: string): string[] {
  const suggestions: string[] = [];
  const titles = nodes.map((n) => n.title);
  const domains = new Set(nodes.map((n) => n.domain).filter(Boolean));

  // Use the query topic to generate targeted follow-ups
  const q = query.toLowerCase();
  const hasDomain = (d: string) => domains.has(d);

  // Identify key entities from node titles for specific suggestions
  const nodeWords = titles.flatMap((t) => t.toLowerCase().split(/\s+/)).filter((w) => w.length > 4);
  const uniqueWords = [...new Set(nodeWords)];

  // Generate specific follow-ups based on actual node content
  const topNodes = titles.slice(0, 3);
  if (topNodes.length >= 1) {
    const sample = topNodes[0];
    suggestions.push(`What led to ${sample.toLowerCase()} and what were its consequences?`);
  }
  if (topNodes.length >= 2) {
    const a = topNodes[0].split(" ").slice(0, 3).join(" ");
    const b = topNodes[1].split(" ").slice(0, 3).join(" ");
    if (a !== b) {
      suggestions.push(`How are "${a}" and "${b}" causally connected?`);
    }
  }

  // Domain-aware suggestion
  if (hasDomain("Economics")) {
    suggestions.push(`What economic factors most influenced ${topNodes[0]?.toLowerCase() || "these events"}?`);
  } else if (hasDomain("Geopolitics")) {
    suggestions.push(`What geopolitical shifts enabled ${topNodes[0]?.toLowerCase() || "these developments"}?`);
  } else if (hasDomain("Technology")) {
    suggestions.push(`What technological breakthroughs drove ${topNodes[0]?.toLowerCase() || "this change"}?`);
  } else if (topNodes[0]) {
    suggestions.push(`What were the root causes of ${topNodes[0].toLowerCase()}?`);
  }

  // Contested/alternative perspective
  suggestions.push(`Are there competing explanations for ${topNodes[0]?.toLowerCase() || "this pattern"}?`);

  return suggestions.slice(0, 4);
}

export default function DiscoveryCards({ nodes, query, onQuerySelect }: DiscoveryCardsProps) {
  const suggestions = useMemo(() => generateSuggestions(nodes, query), [nodes, query]);

  if (nodes.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 0",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 2,
        }}
      >
        You may also ask
      </div>
      {suggestions.map((q, i) => (
        <button
          key={i}
          onClick={() => onQuerySelect(q)}
          style={{
            textAlign: "left",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
            color: "var(--text-2)",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
            lineHeight: 1.4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--brand)";
            e.currentTarget.style.background = "var(--bg-subtle)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "var(--surface)";
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
