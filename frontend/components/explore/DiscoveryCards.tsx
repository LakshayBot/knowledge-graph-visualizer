"use client";

import { useMemo } from "react";
import type { GraphNode } from "@/types/graph";

interface DiscoveryCardsProps {
  nodes: GraphNode[];
  onQuerySelect: (query: string) => void;
}

/** Generate follow-up questions based on graph content */
function generateSuggestions(nodes: GraphNode[]): string[] {
  const suggestions: string[] = [];
  const domains = new Set(nodes.map((n) => n.domain).filter(Boolean));

  if (domains.has("Economics")) {
    suggestions.push("How did global trade policies evolve between 1990 and 2025?");
  }
  if (domains.has("Geopolitics") || domains.has("Military")) {
    suggestions.push("What were the key turning points in modern geopolitical conflicts?");
  }
  if (domains.has("Technology")) {
    suggestions.push("How did AI development from 2010 to 2025 reshape global industries?");
  }
  if (domains.has("Social") || domains.has("Cultural")) {
    suggestions.push("What social movements had the most impact between 2000 and 2025?");
  }

  // Add topic-specific suggestions based on node titles
  const titles = nodes.map((n) => n.title.toLowerCase());
  if (titles.some((t) => t.includes("crisis") || t.includes("financial"))) {
    suggestions.push("Could the 2008 financial crisis have been prevented?");
  }
  if (titles.some((t) => t.includes("pandemic") || t.includes("covid"))) {
    suggestions.push("How will pandemic preparedness change global health policy by 2030?");
  }
  if (titles.some((t) => t.includes("war") || t.includes("conflict"))) {
    suggestions.push("What economic sanctions have been most effective since 2000?");
  }

  // Fill up to 4 suggestions
  if (suggestions.length < 3) {
    suggestions.push("What hidden connections exist in this knowledge graph?");
    suggestions.push("How do these events connect to current global trends?");
  }

  return suggestions.slice(0, 4);
}

export default function DiscoveryCards({ nodes, onQuerySelect }: DiscoveryCardsProps) {
  const suggestions = useMemo(() => generateSuggestions(nodes), [nodes]);

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
